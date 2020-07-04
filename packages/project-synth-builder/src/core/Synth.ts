import { IAudioGraphNode, MINIMUM_GAIN, NodeTypes } from "../model/nodes";
import { AudioGraphNode } from "./nodes/AudioGraphNode";
import { KeyboardController } from "./KeyboardController";
import { NoteHertzValues, Notes } from "../model/notes";

type SynthNodes = [OscillatorNode, GainNode];

export class Synth implements KeyboardController {
  private ctx: AudioContext | undefined;
  private readonly notes = new Map<Notes, SynthNodes>();
  private readonly playing = new Set<Notes>();

  constructor(
    private osc: IAudioGraphNode = AudioGraphNode.createOscillator().connectNode(
      AudioGraphNode.createGain().connectNode(
        AudioGraphNode.createDestination(),
      ),
    ),
  ) {}

  public get oscillator(): IAudioGraphNode {
    return this.osc;
  }

  public set oscillator(osc: IAudioGraphNode) {
    this.osc = osc;
    const notesToRestart = Array.from(this.playing.values());
    notesToRestart.forEach((note) => {
      this.stopPlaying(note);
    });
    this.notes.clear();
    notesToRestart.forEach((note) => this.startPlaying(note));
  }

  private get maxGain(): number {
    const gainGraphNode = this.osc.outputs?.[0];
    const definedMaxGain = gainGraphNode?.properties["maxGain"];
    return Math.max(
      definedMaxGain === undefined ? 1 : (definedMaxGain as number),
      MINIMUM_GAIN,
    );
  }

  buildNode(context: AudioContext, frequency?: number): SynthNodes {
    const osc = frequency
      ? this.oscillator.withProperty("frequency", frequency)
      : this.oscillator;

    const { node, outputs } = osc.build<OscillatorNode>(context);
    node.start(0);

    // oscillators are only allowed one output, in this case we need it to always be the gain node
    const gainNode = outputs[0].node as GainNode;

    gainNode.gain.value = MINIMUM_GAIN;
    return [node, gainNode];
  }

  public get context(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  startPlaying(note: Notes) {
    if (!this.notes.has(note)) {
      const [oscillator, gainNode] = this.buildNode(
        this.context,
        NoteHertzValues[note],
      );
      this.notes.set(note, [oscillator, gainNode]);
    }
    if (this.playing.has(note)) {
      return;
    }
    const [, gainNode] = this.notes.get(note) as SynthNodes;
    gainNode.gain.setValueAtTime(gainNode.gain.value, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      this.maxGain,
      this.context.currentTime + 0.03,
    );
    this.playing.add(note);
  }

  stopPlaying(note: Notes) {
    if (this.playing.has(note) && this.notes.has(note)) {
      const [, gainNode] = this.notes.get(note) as SynthNodes;
      gainNode.gain.setValueAtTime(
        gainNode.gain.value,
        this.context.currentTime,
      );
      gainNode.gain.exponentialRampToValueAtTime(
        MINIMUM_GAIN,
        this.context.currentTime + 0.05,
      );
      this.playing.delete(note);
    }
  }
}
