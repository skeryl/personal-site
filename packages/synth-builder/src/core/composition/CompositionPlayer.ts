import {
  AutomaticComposition,
  Note,
  NoteType,
  Playable,
  TimeSignature,
} from "./index";
import { Instrument } from "../Instrument";

interface ScheduledNote {
  offsetMilliseconds: number;
  note: Playable;
  instrument: Instrument;
  duration: number;
}

function calculateDurationMilliseconds(
  timeSignature: TimeSignature,
  millisecondsPerBeat: number,
  noteType: NoteType,
) {
  return (noteType / timeSignature.quarterNotesBeat) * millisecondsPerBeat;
}

export class CompositionPlayer {
  constructor(
    private readonly context: AudioContext,
    private readonly composition: AutomaticComposition,
    private readonly onFinish: () => void,
  ) {}

  private notesToPlay: Array<ScheduledNote> = [];
  private notesToPlayByTime: Array<ScheduledNote> = [];
  private startingTime: number = 0;
  private isPlaying = false;
  private readonly timeouts: Array<number> = [];

  async init() {
    this.notesToPlay = [];

    if (this.context.state === "running") {
      await this.pause();
    }

    this.composition.sections.forEach((section, sectionIndex) => {
      const timeSignature =
        section.timeSignature || this.composition.metadata.timeSignature;
      const bpm = section.bpm || this.composition.metadata.bpm;
      const beatsPerMeasure = timeSignature.beatsPerMeasure;
      const minutesPerBeat = 1 / bpm;
      const millisecondsPerBeat = minutesPerBeat * 60 * 1000;

      section.sequences.forEach((seq, seqIndex) => {
        let elapsedTime = this.startingTime + (seq.offset ?? 0);
        let toLoop = Math.max(seq.loopTimes || 1, 1);
        while (toLoop > 0) {
          seq.sequence.measures.forEach((measure, sectionMeasureIndex) => {
            measure.notes.forEach((note) => {
              const offsetBeatsMilliseconds =
                (note.offsetBeats ?? 0) * millisecondsPerBeat;
              const loopOffset = toLoop * (seq.offset ?? 0);
              this.notesToPlay.push({
                offsetMilliseconds:
                  elapsedTime + offsetBeatsMilliseconds + loopOffset,
                note,
                instrument: seq.instrument,
                duration: calculateDurationMilliseconds(
                  timeSignature,
                  millisecondsPerBeat,
                  note.noteType,
                ),
              });
            });
            elapsedTime += millisecondsPerBeat * beatsPerMeasure;
          });
          toLoop--;
        }
      });
    });
    this.notesToPlayByTime = Array.from(this.notesToPlay).sort((a, b) =>
      Math.sign(a.offsetMilliseconds - b.offsetMilliseconds),
    );
    console.log(this.notesToPlayByTime);
  }

  private get time(): number {
    return this.context.currentTime * 1000;
  }

  async start() {
    this.startingTime = this.time;
    this.isPlaying = true;
    await this.context.resume();
    await this.playNext();
  }

  async stop() {
    while (this.timeouts.length) {
      const [timeout] = this.timeouts.splice(0, 1);
      window.clearTimeout(timeout);
    }
    this.isPlaying = false;
    await this.pause();
    await this.init();
  }

  async playNext() {
    if (this.isPlaying) {
      const nextNote = this.notesToPlayByTime.shift();
      if (!nextNote) {
        await this.stop();
        this.onFinish();
        return;
      }
      const timeToPlay = this.startingTime + nextNote.offsetMilliseconds;
      const timeUntilPlay = timeToPlay - this.time;
      if (timeUntilPlay <= 1) {
        const pitch = (nextNote.note as Note).pitch;
        if (pitch) {
          nextNote.instrument.startPlaying(pitch);
          window.setTimeout(
            () => nextNote.instrument.stopPlaying(pitch),
            nextNote.duration,
          );
        }
      } else {
        this.notesToPlayByTime.splice(0, 0, nextNote);
      }
      this.timeouts.push(window.setTimeout(() => this.playNext(), 1));
    }
  }

  async pause() {
    await this.context.suspend();
  }
}
