import { Notes, Pitch, PitchInformation } from "../../model/notes";
import { Instrument } from "../Instrument";
import { v4 as uuid } from "uuid";

enum DurationType {
  Measures = "Measures",
  Seconds = "Seconds",
  Milliseconds = "Milliseconds",
}

interface Duration {
  type: DurationType;
  amount: number;
}

export enum NoteType {
  whole = 1,
  half = 1 / 2,
  quarter = 1 / 4,
  eighth = 1 / 8,
  sixteenth = 1 / 16,
  thirtysecond = 1 / 32,
  sixtyfourth = 1 / 64,
  tripletHalf = 1 / 2 / 3,
  tripletQuarter = 1 / 4 / 3,
  tripletEighth = 1 / 8 / 3,
  tripletSixteenth = 1 / 16 / 3,
  tripletThirtysecond = 1 / 32 / 3,
  tripletSixtyfourth = 1 / 32 / 3,
}

export interface NoteStyle {
  staccato?: boolean;
  slur?: boolean;
  swing?: boolean;
}

export interface Note {
  noteType: NoteType;
  pitch: Pitch;
  style?: NoteStyle;
  offsetBeats?: number;
}

export interface Measure {
  notes: Note[];
}

export interface Sequence {
  id: string;
  measures: Measure[];
  // duration?: Duration;
  //instrumentHits: InstrumentHit[];
}

export interface SequenceInstance {
  offset?: number;
  sequence: Sequence;
  loopTimes?: number;
  instrument: Instrument;
}

export interface CompositionMetadata {
  id?: string;
  name?: string;
  lastUpdated: Date;
  bpm: number;
  key: Notes;
  timeSignature: TimeSignature;
  lengthMs?: number;
}

export interface CompositionSection {
  bpm?: number;
  timeSignature?: TimeSignature;
  sequences: SequenceInstance[];
}

export interface Composition {
  metadata: CompositionMetadata;
  sections: CompositionSection[];
}

export class AutomaticSection implements CompositionSection {
  public get bpm(): number | undefined {
    return this.section.bpm;
  }
  public get sequences(): SequenceInstance[] {
    return this.section.sequences;
  }
  constructor(
    private readonly section: CompositionSection,
    private readonly compositionMetadata: CompositionMetadata,
  ) {}

  addChordProgression(
    config: SectionConfig & { chords: Chord[] },
  ): AutomaticSection {
    const bpm = config.bpm || this.compositionMetadata.bpm;
    this.sequences.push(
      createChordSequence(
        { ...this.compositionMetadata, bpm },
        config.chords,
        config.instrument,
        config.loop,
      ),
    );
    return this;
  }

  addMelodicImprovisation(config: SectionConfig & { chords: Chord[] }) {
    const bpm = config.bpm || this.compositionMetadata.bpm;
    this.sequences.push(
      createMelodicSequence(
        { ...this.compositionMetadata, bpm },
        config.chords,
        config.instrument,
      ),
    );
    return this;
  }
}

export type CompositionArgs = Partial<CompositionMetadata> &
  Pick<CompositionMetadata, "bpm" | "key" | "timeSignature">;

interface SectionConfig {
  instrument: Instrument;
  bpm?: number;
  chords?: Chord[];
  loop?: number;
}

export enum ChordType {
  MAJOR = "MAJOR",
  MINOR = "MINOR",
  DIMINISHED = "DIMINISHED",
  AUGMENTED = "AUGMENTED",
}

export interface Chord {
  note: Notes;
  type: ChordType;
  octave: number;
}

export interface TimeSignature {
  beatsPerMeasure: number;
  quarterNotesBeat: NoteType;
}

export const CommonTimeSignatures = {
  CommonTime: { beatsPerMeasure: 4, quarterNotesBeat: NoteType.quarter },
};

function getChordSemitoneIntervals(type: ChordType): [number, number, number] {
  switch (type) {
    case ChordType.MAJOR:
      return [0, 4, 7];
    case ChordType.MINOR:
      return [0, 3, 7];
    case ChordType.AUGMENTED:
      return [0, 4, 8];
    case ChordType.DIMINISHED:
      return [0, 3, 6];
  }
}

function getScaleSemitoneIntervals(type: ChordType): number[] {
  switch (type) {
    case ChordType.MAJOR:
      return [0, 4, 5, 7, 9, 12];
    case ChordType.MINOR:
      return [0, 2, 3, 5, 7, 9, 10, 12];
    case ChordType.AUGMENTED:
      return [0, 3, 4, 5, 6, 8, 11, 12];
    case ChordType.DIMINISHED:
      return [0, 3, 6, 0, 3, 6, 12, 12];
  }
}

const pitchesByFrequency = Array.from(Object.entries(PitchInformation))
  .sort(([_, a], [__, b]) => Math.sign(a.hertz - b.hertz))
  .map(([pitch]) => pitch as Pitch);

type PitchToIndex = Partial<Record<Pitch, number>>;

const pitchIndices: PitchToIndex = Object.values(pitchesByFrequency).reduce(
  (res, pitch, ix) => ({ ...res, [pitch]: ix }),
  {},
);

function addSemitones(startingPitch: Pitch, semitonesToAdd: number) {
  const pitchIndex = pitchIndices[startingPitch];
  if (pitchIndex === undefined) {
    throw new Error(`Not sure what to do with ${startingPitch}.`);
  }
  const resultPitch = pitchesByFrequency[pitchIndex + semitonesToAdd];
  if (!resultPitch) {
    throw new Error(`Out of pitch range!`);
  }
  return resultPitch;
}

function getScalePitches(chord: Chord): Pitch[] {
  const startingNote = `${chord.note}${chord.octave}` as Pitch;
  const pitches = getScaleSemitoneIntervals(chord.type).map((interval) =>
    addSemitones(startingNote, interval),
  );
  return pitches;
}

function getNextNoteType(prevNoteType: NoteType | undefined): NoteType {
  switch (prevNoteType) {
    case NoteType.whole:
    case NoteType.half:
      return Math.random() < 0.5 ? NoteType.eighth : NoteType.quarter;
    default:
      const exponent = Math.floor(Math.random() * 4) + 1;
      return (1 / Math.pow(2, exponent)) as NoteType;
  }
}

function getRandom<T>(arr: Array<T>): T {
  const index = Math.floor(Math.random() * arr.length);
  return arr[index];
}

function getNextPitch(pitches: Pitch[], lastPitch: Pitch | undefined) {
  let nextPitch: Pitch | undefined;
  while (!nextPitch || nextPitch === lastPitch) {
    nextPitch = getRandom(pitches);
  }
  return nextPitch;
}

function getRandomNoteSequenceInScale(
  chord: Chord,
  metadata: CompositionMetadata,
): Note[] {
  const scalePitches = getScalePitches(chord);
  let totalToFill =
    metadata.timeSignature.beatsPerMeasure *
    metadata.timeSignature.quarterNotesBeat;
  let filledSoFar = 0;
  let lastNoteType: NoteType | undefined;
  let lastPitch: Pitch | undefined;
  const notes: Note[] = [];
  while (totalToFill > 0) {
    const potentialNoteType = getNextNoteType(lastNoteType);
    const noteType =
      potentialNoteType > totalToFill ? totalToFill : potentialNoteType;
    const pitch = getNextPitch(scalePitches, lastPitch);
    notes.push({
      noteType: noteType,
      pitch,
      offsetBeats: filledSoFar,
    });
    lastPitch = pitch;
    lastNoteType = noteType;
    totalToFill -= noteType;
    filledSoFar += noteType * (1 / metadata.timeSignature.quarterNotesBeat);
  }
  return notes;
}

function generateChordNotes(chord: Chord): Note[] {
  const startingNote = `${chord.note}${chord.octave}` as Pitch;
  const intervals = getChordSemitoneIntervals(chord.type);
  return intervals.map((semitonesToAdd) => ({
    noteType: NoteType.whole,
    pitch: addSemitones(startingNote, semitonesToAdd),
  }));
}

function createMelodicSequence(
  metadata: CompositionMetadata,
  chordProgression: Chord[],
  instrument: Instrument,
): SequenceInstance {
  return {
    instrument,
    sequence: {
      id: uuid(),
      measures: chordProgression.map((chrd, ix) => ({
        notes: getRandomNoteSequenceInScale(chrd, metadata),
      })),
    },
  };
}

function createChordSequence(
  metadata: CompositionMetadata,
  chordProgression: Chord[],
  instrument: Instrument,
  loop?: number,
): SequenceInstance {
  return {
    instrument,
    loopTimes: loop,
    sequence: {
      id: uuid(),
      measures: chordProgression.map((chrd) => ({
        notes: generateChordNotes(chrd),
      })),
    },
  };
}

export class AutomaticComposition implements Composition {
  private readonly composition: Composition;

  constructor({
    bpm,
    lengthMs,
    key,
    timeSignature,
    ...otherMetadata
  }: CompositionArgs) {
    this.composition = {
      metadata: {
        bpm,
        key,
        timeSignature,
        ...otherMetadata,
        lastUpdated: new Date(),
      },
      sections: [],
    };
  }

  public get metadata(): CompositionMetadata {
    return this.composition.metadata;
  }

  public get sections(): CompositionSection[] {
    return this.composition.sections;
  }

  startSection(
    sectionInfo: Partial<
      Pick<CompositionSection, "bpm" | "timeSignature">
    > = {},
  ): AutomaticSection {
    const automaticSection = new AutomaticSection(
      {
        ...sectionInfo,
        sequences: [],
      },
      this.composition.metadata,
    );
    this.composition.sections.push(automaticSection);
    return automaticSection;
  }
}
