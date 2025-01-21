import {
  AccidentalValue,
  Attributes,
  Beam,
  Clef,
  Degree,
  Harmony,
  HarmonyKind,
  Key,
  Measure,
  Notations,
  Note,
  NoteType,
  Offset,
  Pitch,
  Print,
  Root,
  Song,
  Step,
  Tied,
  TimeSignature,
} from "./types-generated/musicxml-types";

export interface ChordRoot {
  step: Step; // The note step (e.g., A, B, C, etc.)
  accidental?: AccidentalValue; // Optional accidental (e.g., sharp, flat, natural)
}

export interface IntervalAlteration {
  interval: number; // Interval (e.g., 5 for fifth, 9 for ninth)
  alter: number; // Alteration: +1 for sharp, -1 for flat
}

export type ChordQuality =
  | "major"
  | "minor"
  | "diminished"
  | "augmented"
  | "dominant"
  | "suspended"
  | "suspended-2"
  | "suspended-4"
  | "major-seventh"
  | "minor-seventh"
  | "half-diminished"
  | "fully-diminished"; // Chord quality

export class Chord {
  public root: ChordRoot; // Root note (e.g., G, C, F)
  public quality: ChordQuality;
  public octave: number = 4;
  public extensions?: number[]; // Array of extensions (e.g., [7, 9, 13])
  public inversion?: number; // Inversion (e.g., 0 = root position, 1 = first inversion)
  public intervalAlterations?: IntervalAlteration[]; // Alterations to specific intervals

  constructor(
    root: Step | ChordRoot,
    quality: ChordQuality = "major",
    extensions?: number[],
    octave?: number,
    intervalAlterations?: IntervalAlteration[],
    inversion?: number,
  ) {
    this.root = typeof root === "string" ? ({ step: root } as ChordRoot) : root;
    this.quality = quality;
    this.extensions = extensions;
    this.inversion = inversion;
    if (Number.isFinite(octave) && octave !== undefined) {
      this.octave = octave;
    }
    this.intervalAlterations = intervalAlterations;
  }
}

export type ChordPair = [Chord, Chord];

export type ChordLike = ChordPair | Chord;

const chromaticScaleNeutrals: ChordRoot[] = [
  { step: "C" },
  { step: "C", accidental: "sharp" },
  { step: "D" },
  { step: "E", accidental: "flat" },
  { step: "E" },
  { step: "F" },
  { step: "F", accidental: "sharp" },
  { step: "G" },
  { step: "G", accidental: "sharp" },
  { step: "A" },
  { step: "B", accidental: "flat" },
  { step: "B" },
];

const chromaticScaleSharps: ChordRoot[] = [
  { step: "C" },
  { step: "C", accidental: "sharp" },
  { step: "D" },
  { step: "D", accidental: "sharp" },
  { step: "E" },
  { step: "F" },
  { step: "F", accidental: "sharp" },
  { step: "G" },
  { step: "G", accidental: "sharp" },
  { step: "A" },
  { step: "A", accidental: "sharp" },
  { step: "B" },
];

const chromaticScaleFlats: ChordRoot[] = [
  { step: "C" },
  { step: "D", accidental: "flat" },
  { step: "D" },
  { step: "E", accidental: "flat" },
  { step: "E" },
  { step: "F" },
  { step: "G", accidental: "flat" },
  { step: "G" },
  { step: "A", accidental: "flat" },
  { step: "A" },
  { step: "B", accidental: "flat" },
  { step: "B" },
];

function shouldUseSharps(chord: Chord, key: Key): boolean | null {
  const minorFlatKeys = ["G", "D", "C", "F", "Bb", "Eb", "Ab"];
  const minorSharpKeys = ["E", "B", "F#", "C#", "G#", "D#", "A#"];

  const dominantFlatKeys = ["C", "F", "Bb", "Eb", "Ab", "Db", "Gb"];
  const dominantSharpKeys = ["G", "D", "A", "E", "B", "F#", "C#"];

  const sharpKeys = ["G", "D", "A", "E", "B", "F#", "C#"]; // Keys with sharps
  const flatKeys = ["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"]; // Keys with flats

  const rootStep = `${chord.root.step}${chord.root.accidental === "sharp" ? "#" : chord.root.accidental === "flat" ? "b" : ""}`;
  const accidental = chord.root.accidental;

  // 1. Prioritize explicit accidentals on the chord root
  if (accidental === "sharp") return true;
  if (accidental === "flat") return false;

  // 2. Handle minor and diminished chords (favor flats locally)
  if (
    chord.quality === "minor" ||
    chord.quality === "diminished" ||
    chord.quality === "minor-seventh"
  ) {
    if (minorFlatKeys.includes(rootStep)) return false; // Prefer flats in flat contexts
    if (minorSharpKeys.includes(rootStep)) return true; // Prefer flats in flat contexts
    return false; // Default to flats for minor/diminished chords
  }

  if (chord.quality === "dominant") {
    if (dominantFlatKeys.includes(rootStep)) return false;
    if (dominantSharpKeys.includes(rootStep)) return true;
  }

  // 3. Use the key signature's fifths value as a fallback
  if (key.fifths > 0) return true; // Sharps for positive fifths (sharp keys)
  if (key.fifths < 0) return false; // Flats for negative fifths (flat keys)

  // 4. Default based on sharp or flat key lists
  if (sharpKeys.includes(rootStep)) return true;
  if (flatKeys.includes(rootStep)) return false;

  // 5. Default to sharps for ambiguous cases
  return null;
}

function getChordIntervals(chord: Chord): number[] {
  // Define the intervals for a complete 7-note scale based on chord quality
  const intervalsByQuality: Record<ChordQuality, number[]> = {
    major: [0, 2, 4, 5, 7, 9, 11], // Ionian scale (Major scale)
    minor: [0, 2, 3, 5, 7, 8, 10], // Aeolian scale (Natural minor)
    diminished: [0, 2, 3, 5, 6, 8, 10], // Locrian scale
    augmented: [0, 4, 8, 10, 12, 14, 16], // Augmented scale (symmetrical)
    dominant: [0, 2, 4, 5, 7, 9, 10], // Mixolydian scale
    suspended: [0, 2, 5, 7, 9, 11, 12], // Major scale with a suspension focus
    "suspended-2": [0, 2, 5, 7, 9, 11, 12], // Similar to suspended but emphasizing 2
    "suspended-4": [0, 5, 7, 9, 11, 12, 14], // Focus on 4th interval
    "major-seventh": [0, 2, 4, 5, 7, 9, 11], // Major scale with major 7th
    "minor-seventh": [0, 2, 3, 5, 7, 8, 10], // Minor scale with minor 7th
    "half-diminished": [0, 2, 3, 5, 6, 8, 10], // Minor 7 flat 5
    "fully-diminished": [0, 3, 6, 9, 12, 15, 18], // Diminished 7th scale
  };

  // Get the intervals for the chord quality
  const baseIntervals = intervalsByQuality[chord.quality];
  if (!baseIntervals) {
    throw new Error(`Unsupported chord quality: ${chord.quality}`);
  }

  // Add extensions if provided
  let combinedIntervals = [...baseIntervals];
  if (chord.extensions) {
    const extendedIntervals = chord.extensions.map((ext) => {
      const semitoneOffset =
        ((ext - 1) % 7) * 2 + Math.floor((ext - 1) / 7) * 12;
      return semitoneOffset;
    });
    combinedIntervals = Array.from(
      new Set([...combinedIntervals, ...extendedIntervals]),
    );
  }

  // Apply alterations
  if (chord.intervalAlterations) {
    for (const alteration of chord.intervalAlterations) {
      const semitoneOffset =
        ((alteration.interval - 1) % 7) * 2 +
        Math.floor((alteration.interval - 1) / 7) * 12;
      const index = combinedIntervals.indexOf(semitoneOffset);

      if (index !== -1) {
        combinedIntervals[index] += alteration.alter; // Adjust the interval
      } else {
        // If the interval is not part of the base intervals, add it directly
        combinedIntervals.push(semitoneOffset + alteration.alter);
      }
    }
  }

  // Ensure intervals are sorted
  combinedIntervals.sort((a, b) => a - b);

  return combinedIntervals;
}

/*function getChordIntervals(chord: Chord): number[] {
  // Define the intervals for a complete 7-note scale based on chord quality
  const intervalsByQuality: Record<ChordQuality, number[]> = {
    major: [0, 2, 4, 5, 7, 9, 11], // Ionian scale (Major scale)
    minor: [0, 2, 3, 5, 7, 8, 10], // Aeolian scale (Natural minor)
    diminished: [0, 2, 3, 5, 6, 8, 10], // Locrian scale
    augmented: [0, 4, 8, 10, 12, 14, 16], // Augmented scale (symmetrical)
    dominant: [0, 2, 4, 5, 7, 9, 10], // Mixolydian scale
    suspended: [0, 2, 5, 7, 9, 11, 12], // Major scale with a suspension focus
    "suspended-2": [0, 2, 5, 7, 9, 11, 12], // Similar to suspended but emphasizing 2
    "suspended-4": [0, 5, 7, 9, 11, 12, 14], // Focus on 4th interval
    "major-seventh": [0, 2, 4, 5, 7, 9, 11], // Major scale with major 7th
    "minor-seventh": [0, 2, 3, 5, 7, 8, 10], // Minor scale with minor 7th
    "half-diminished": [0, 2, 3, 5, 6, 8, 10], // Minor 7 flat 5
    "fully-diminished": [0, 3, 6, 9, 12, 15, 18], // Diminished 7th scale
  };

  // Get the intervals for the chord quality
  const intervals = intervalsByQuality[chord.quality];
  if (!intervals) {
    throw new Error(`Unsupported chord quality: ${chord.quality}`);
  }

  // Add extensions if provided
  if (chord.extensions) {
    const extendedIntervals = chord.extensions.map((ext) => ext - 1);
    const combinedIntervals = Array.from(
      new Set([...intervals, ...extendedIntervals]),
    );
    combinedIntervals.sort((a, b) => a - b); // Ensure intervals are sorted
    return combinedIntervals;
  }

  return intervals;
}*/

/*function getScaleNotes(chord: Chord, key: Key): ChordRoot[] {
  // Determine if the scale should use sharps or flats based on the key
  const useSharps = shouldUseSharps(chord, key);
  const chromaticScale = useSharps ? chromaticScaleSharps : chromaticScaleFlats;

  // Helper to find the index of a note in the chromatic scale
  const findNoteIndex = (note: ChordRoot): number => {
    const notePredicate = (scaleNote: ChordRoot) =>
      scaleNote.step === note.step && scaleNote.accidental === note.accidental;
    return chromaticScale.findIndex(notePredicate);
  };

  // Find the root note index
  const rootIndex = findNoteIndex(chord.root);
  if (rootIndex === -1) {
    throw new Error(
      `Root note ${chord.root.step} not found in chromatic scale`,
    );
  }

  const intervals = getChordIntervals(chord);

  // Calculate the notes in the scale
  const scaleNotes = intervals.map((interval) => {
    const noteIndex = (rootIndex + interval) % chromaticScale.length;
    return chromaticScale[noteIndex];
  });

  // Apply inversion if specified
  if (chord.inversion !== undefined && chord.inversion > 0) {
    const invertedNotes = scaleNotes.splice(0, chord.inversion);
    scaleNotes.push(...invertedNotes);
  }

  return scaleNotes;
}*/
export function resolveNotePreference(
  chord: Chord,
  input: ChordRoot,
  key: Key,
): ChordRoot {
  const step = input.step;
  const accidental = input.accidental;
  const keyFifths = key.fifths;

  // Handle explicit accidentals
  const isKeyFlat = keyFifths < 0;
  const isKeySharp = keyFifths > 0;
  const isKeyNeutral = keyFifths === 0;

  const useSharps = shouldUseSharps(chord, key);
  const chordIsFlat = useSharps === false;
  const chordIsSharp = useSharps === true;

  if (chord.root.step === "G" && chord.quality === "minor") {
  }

  if (accidental === "sharp" && isKeyFlat && chordIsFlat) {
    switch (step) {
      case "E":
        return { step: "F" }; // Avoid E#
      case "B":
        return { step: "C" }; // Avoid B#
      case "A":
        return { step: "B", accidental: "flat" };
      case "G":
        return { step: "A", accidental: "flat" };
      case "D":
        return { step: "E", accidental: "flat" };
      case "C":
        return { step: "D", accidental: "flat" };
      default:
        return input;
    }
  } else {
    if (accidental === "flat" && isKeySharp && chordIsSharp) {
      switch (step) {
        case "F":
          return { step: "E" }; // Avoid F flat
        case "C":
          return { step: "B" }; // Avoid C flat
        case "G":
          return { step: "F", accidental: "sharp" };
        case "D":
          return { step: "C", accidental: "sharp" };
        case "A":
          return { step: "G", accidental: "sharp" };
        case "E":
          return { step: "D", accidental: "sharp" };
        case "B":
          return { step: "A", accidental: "sharp" };
        default:
          return input;
      }
    }
  }

  if (isKeyNeutral) {
    if (accidental === "sharp") {
      if (step === "A") return { step: "B", accidental: "flat" };
    } else if (accidental === "flat") {
      if (step === "G") return { step: "F", accidental: "sharp" };
      if (step === "F") return { step: "E" };
      if (step === "C") return { step: "B" };
    }
  }

  // Final cleanup: Ensure no E# or B# appear
  if (step === "E" && accidental === "sharp") return { step: "F" };
  if (step === "B" && accidental === "sharp") return { step: "C" };

  // Default case
  return input;
}

function getChromaticScale(chord: Chord, key: Key) {
  const useSharps = shouldUseSharps(chord, key);
  return useSharps === null
    ? chromaticScaleNeutrals
    : useSharps
      ? chromaticScaleSharps
      : chromaticScaleFlats;
}

function getScaleNotes(chord: Chord, key: Key): ChordRoot[] {
  // Determine if the scale should use sharps or flats based on the key
  const chromaticScale = getChromaticScale(chord, key);

  // Helper to find the index of a note in the chromatic scale
  const findNoteIndex = (note: ChordRoot): number => {
    const notePredicate = (scaleNote: ChordRoot) =>
      scaleNote.step === note.step && scaleNote.accidental === note.accidental;
    return chromaticScale.findIndex(notePredicate);
  };

  // Find the root note index
  const rootIndex = findNoteIndex(chord.root);
  if (rootIndex === -1) {
    throw new Error(
      `Root note ${chord.root.step} not found in chromatic scale`,
    );
  }

  const intervals = getChordIntervals(chord);

  // Calculate the notes in the scale
  const scaleNotes = intervals.map((interval) => {
    const noteIndex = (rootIndex + interval) % chromaticScale.length;
    const rawNote = chromaticScale[noteIndex];
    //return chromaticScale[noteIndex];
    return resolveNotePreference(chord, rawNote, key); // Apply preference bias
  });

  // Apply inversion if specified
  if (chord.inversion !== undefined && chord.inversion > 0) {
    const invertedNotes = scaleNotes.splice(0, chord.inversion);
    scaleNotes.push(...invertedNotes);
  }

  return scaleNotes;
}

function accidentalValueToAlter(
  accidental: AccidentalValue | undefined,
): number | undefined {
  switch (accidental) {
    case "sharp":
      return 1;
    case "flat":
      return -1;
    case "natural":
      return 0;
    case "double-sharp":
      return 2;
    case "flat-flat":
      return -2;
    case "quarter-sharp":
      return 0.5;
    case "quarter-flat":
      return -0.5;
    case "three-quarters-sharp":
      return 1.5;
    case "three-quarters-flat":
      return -1.5;
    case "slash-quarter-sharp":
      return 0.25;
    case "slash-flat":
      return -0.25;
    case "double-slash-flat":
      return -0.75;
    case "sharp-1":
      return 1; // Alternate name for sharp
    case "sharp-2":
      return 2; // Alternate name for double-sharp
    case "sharp-3":
      return 3;
    case "sharp-5":
      return 5;
    case "flat-1":
      return -1; // Alternate name for flat
    case "flat-2":
      return -2; // Alternate name for double-flat
    case "flat-3":
      return -3;
    case "flat-4":
      return -4;
    case "sori":
      return 0.25; // Traditional Persian accidental
    case "koron":
      return -0.25; // Traditional Persian accidental
    default:
      return undefined; // If the accidental is not recognized
  }
}

function calculateOctave(
  chord: Chord,
  key: Key,
  interval: number,
  note: ChordRoot,
): number {
  const chromaticScale = getChromaticScale(chord, key);

  // Find indices of the root note and current note
  const rootIndex = chromaticScale.findIndex(
    (n) => n.step === chord.root.step && n.accidental === chord.root.accidental,
  );
  const noteIndex = chromaticScale.findIndex(
    (n) => n.step === note.step && n.accidental === note.accidental,
  );

  const baseOctave = chord.octave;

  // Validate indices
  if (rootIndex === -1 || noteIndex === -1) {
    console.warn(`Invalid note: rootNote=${chord.root.step}, note=${note}`);
    return baseOctave;
  }

  // Calculate base octave adjustment
  const octaveAdjustment = Math.floor(interval / chromaticScale.length);

  // Handle wraparound logic
  const isWraparound = noteIndex < rootIndex;
  if (isWraparound && interval % chromaticScale.length > 0) {
    return baseOctave + octaveAdjustment + 1; // Increment to next octave
  }

  return baseOctave + octaveAdjustment;
}

function getChordNotes(
  chord: Chord,
  key: Key,
  intervals: number[],
  noteType: NoteType = NoteType.Eighth,
): Note[] {
  const scaleNotes = getScaleNotes(chord, key);
  return intervals.map((interval, index) =>
    getNoteForInterval(
      scaleNotes,
      interval,
      chord,
      key,
      index,
      intervals.length,
      noteType,
    ),
  );
}

function generateChordMeasureForPair(
  key: Key,
  chordPair: ChordPair,
  sequence: number,
  measureBreak: boolean,
): Measure {
  const [chordA, chordB] = chordPair;

  const notesA: Note[] = getChordNotes(
    chordA,
    key,
    [1, 3, 5, 7],
    NoteType.Eighth,
  );
  const notesB: Note[] = getChordNotes(
    chordB,
    key,
    [1, 3, 5, 7],
    NoteType.Eighth,
  );

  return getMeasure(
    sequence,
    [...notesA, ...notesB],
    chordPair,
    key,
    measureBreak,
  );
}

function getNoteForInterval(
  scaleNotes: ChordRoot[],
  interval: number,
  chord: Chord,
  key: Key,
  noteIndex: number,
  notesInGroup: number,
  type: NoteType,
) {
  const scaleNoteIndex = (interval - 1) % scaleNotes.length;
  const noteChordRoot = scaleNotes[scaleNoteIndex];
  if (!noteChordRoot) {
    console.warn("missing note.", scaleNotes, interval, scaleNoteIndex);
  }
  return new Note({
    pitch: new Pitch(
      noteChordRoot.step,
      calculateOctave(chord, key, interval, noteChordRoot),
      accidentalValueToAlter(noteChordRoot.accidental),
    ),
    duration: 1,
    type,
    beam:
      type === NoteType.Eighth ||
      type === NoteType.Sixteenth ||
      type === NoteType.ThirtySecond
        ? new Beam(
            1,
            noteIndex === 0
              ? "begin"
              : noteIndex === notesInGroup - 1
                ? "end"
                : "continue",
          )
        : undefined,
  });
}

function getMeasure(
  sequence: number,
  notes: Note[],
  chord: ChordLike,
  key: Key,
  printNewSystem: boolean,
) {
  const chords = Array.isArray(chord) ? chord : [chord];
  const timeSignature = new TimeSignature({ beats: 4, beatType: 4 }); // todo: move up the stack
  return new Measure({
    number: sequence + 1,
    notes: notes,
    harmony: chords.map(
      (chord, ix) =>
        new Harmony({
          root: new Root(
            chord.root.step,
            accidentalValueToAlter(chord.root.accidental),
          ),
          kind: new HarmonyKind(chord.quality, true),
          degree: chord.intervalAlterations?.map(
            (ext) => new Degree(ext.interval, ext.alter, "alter"),
          ),
          offset: chords.length <= 1 ? undefined : new Offset(ix === 0 ? 1 : 3),
        }),
    ),
    print: printNewSystem ? [new Print({ newSystem: true })] : undefined,
    attributes:
      sequence === 0
        ? new Attributes({
            divisions: 1,
            key: [key],
            time: [timeSignature],
            clef: [new Clef({ sign: "G", line: 2 })],
          })
        : undefined,
    printNewSystem: true,
  });
}

function generateChordMeasure(
  key: Key,
  chordLike: ChordLike,
  sequence: number,
  measureBreak: number,
  type: NoteType = NoteType.Eighth,
): Measure {
  const isAtMeasureBreak = sequence % measureBreak === 0;
  if (Array.isArray(chordLike)) {
    return generateChordMeasureForPair(
      key,
      chordLike as ChordPair,
      sequence,
      isAtMeasureBreak,
    );
  }
  const chord = chordLike as Chord;

  const scaleNotes = getScaleNotes(chord, key);
  const chordIntervals = [3, 5, 7, 6, 5, 3]; // Intervals to generate (3rd, 5th, 7th, 6th)

  // Generate notes for the measure
  const notes: Note[] = chordIntervals.map((interval, noteIx) => {
    const note = getNoteForInterval(
      scaleNotes,
      interval,
      chord,
      key,
      noteIx,
      chordIntervals.length,
      type,
    );

    note.notations =
      noteIx === chordIntervals.length - 1
        ? new Notations({ tied: [new Tied({ type: "start" })] })
        : undefined;
    return note;
  });

  notes.push(
    new Note({
      pitch: notes[notes.length - 1].pitch,
      duration: 2,
      type: NoteType.Quarter,
      notations: new Notations({ tied: [new Tied({ type: "stop" })] }),
    }),
  );
  return getMeasure(sequence, notes, chord, key, isAtMeasureBreak);
}

export function generateMeasures(song: Song): string {
  return song.chords
    .map((chord, ix) =>
      generateChordMeasure(song.key, chord, ix, song.breakMeasures).toXml(),
    )
    .join("\r\n");
}
