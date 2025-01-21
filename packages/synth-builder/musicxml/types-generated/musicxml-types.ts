import { ChordLike } from "../helpers";

export type AboveBelow = "above" | "below";

export type BeamLevel = number;

export type Color = string;

export type CommaSeparatedText = string;

export type CssFontSize =
  | "xx-small"
  | "x-small"
  | "small"
  | "medium"
  | "large"
  | "x-large"
  | "xx-large";

export type Divisions = number;

export type EnclosureShape =
  | "rectangle"
  | "square"
  | "oval"
  | "circle"
  | "bracket"
  | "inverted-bracket"
  | "triangle"
  | "diamond"
  | "pentagon"
  | "hexagon"
  | "heptagon"
  | "octagon"
  | "nonagon"
  | "decagon"
  | "none";

export type FermataShape =
  | "normal"
  | "angled"
  | "square"
  | "double-angled"
  | "double-square"
  | "double-dot"
  | "half-curve"
  | "curlew"
  | "";

export type FontFamily = string; // csv

export type FontStyle = "normal" | "italic";

export type FontWeight = "normal" | "bold";

export type LeftCenterRight = "left" | "center" | "right";

export type LeftRight = "left" | "right";

export type LineLength = "short" | "medium" | "long";

export type LineShape = "straight" | "curved";

export type LineType = "solid" | "dashed" | "dotted" | "wavy";

export type Midi16 = number;

export type Midi128 = number;

export type Midi16384 = number;

export type Mute =
  | "on"
  | "off"
  | "straight"
  | "cup"
  | "harmon-no-stem"
  | "harmon-stem"
  | "bucket"
  | "plunger"
  | "hat"
  | "solotone"
  | "practice"
  | "stop-mute"
  | "stop-hand"
  | "echo"
  | "palm";

export type NonNegativeDecimal = number;

export type NumberLevel = number;

export type NumberOfLines = number;

export type NumeralValue = number;

export type OverUnder = "over" | "under";

export type Percent = number;

export type PositiveDecimal = number;

export type PositiveDivisions = number;

export type RotationDegrees = number;

export type SemiPitched =
  | "high"
  | "medium-high"
  | "medium"
  | "medium-low"
  | "low"
  | "very-low";

export type SmuflGlyphName = string;

export type SmuflAccidentalGlyphName = string; // smufl-glyph-name

export type SmuflCodaGlyphName = string; // smufl-glyph-name

export type SmuflLyricsGlyphName = string; // smufl-glyph-name

export type SmuflPictogramGlyphName = string; // smufl-glyph-name

export type SmuflSegnoGlyphName = string; // smufl-glyph-name

export type SmuflWavyLineGlyphName = string; // smufl-glyph-name

export type StartNote = "upper" | "main" | "below";

export type StartStop = "start" | "stop";

export type StartStopContinue = "start" | "stop" | "continue";

export type StartStopSingle = "start" | "stop" | "single";

export type StringNumber = number;

export type SymbolSize = "full" | "cue" | "grace-cue" | "large";

export type Tenths = number;

export type TextDirection = "ltr" | "rtl" | "lro" | "rlo";

export type TiedType = "start" | "stop" | "continue" | "let-ring";

export type TimeOnly = string;

export type TopBottom = "top" | "bottom";

export type TremoloType = "start" | "stop" | "single" | "unmeasured";

export type TrillBeats = number;

export type TrillStep = "whole" | "half" | "unison";

export type TwoNoteTurn = "whole" | "half" | "none";

export type UpDown = "up" | "down";

export type UprightInverted = "upright" | "inverted";

export type Valign = "top" | "middle" | "bottom" | "baseline";

export type ValignImage = "top" | "middle" | "bottom";

export type YesNo = "yes" | "no";

export type YyyyMmDd = string;

export type CancelLocation = "left" | "right" | "before-barline";

export type ClefSign =
  | "G"
  | "F"
  | "C"
  | "percussion"
  | "TAB"
  | "jianpu"
  | "none";

export type Fifths = number;

export type Mode = string;

export type ShowFrets = "numbers" | "letters";

export type StaffLine = number;

export type StaffLinePosition = number;

export type StaffNumber = number;

export type StaffType = "ossia" | "editorial" | "cue" | "alternate" | "regular";

export type TimeRelation =
  | "parentheses"
  | "bracket"
  | "equals"
  | "slash"
  | "space"
  | "hyphen";

export type TimeSeparator =
  | "none"
  | "horizontal"
  | "diagonal"
  | "vertical"
  | "adjacent";

export type TimeSymbol =
  | "common"
  | "cut"
  | "single-number"
  | "note"
  | "dotted-note"
  | "normal";

export type BackwardForward = "backward" | "forward";

export type BarStyle =
  | "regular"
  | "dotted"
  | "dashed"
  | "heavy"
  | "light-light"
  | "light-heavy"
  | "heavy-light"
  | "heavy-heavy"
  | "tick"
  | "short"
  | "none";

export type EndingNumber = string;

export type RightLeftMiddle = "right" | "left" | "middle";

export type StartStopDiscontinue = "start" | "stop" | "discontinue";

export type Winged =
  | "none"
  | "straight"
  | "curved"
  | "double-straight"
  | "double-curved";

export type AccordionMiddle = number;

export type BeaterValue =
  | "bow"
  | "chime hammer"
  | "coin"
  | "drum stick"
  | "finger"
  | "fingernail"
  | "fist"
  | "guiro scraper"
  | "hammer"
  | "hand"
  | "jazz stick"
  | "knitting needle"
  | "metal hammer"
  | "slide brush on gong"
  | "snare stick"
  | "spoon mallet"
  | "superball"
  | "triangle beater"
  | "triangle beater plain"
  | "wire brush";

export type DegreeSymbolValue =
  | "major"
  | "minor"
  | "augmented"
  | "diminished"
  | "half-diminished";

export type DegreeTypeValue = "add" | "alter" | "subtract";

export type EffectValue =
  | "anvil"
  | "auto horn"
  | "bird whistle"
  | "cannon"
  | "duck call"
  | "gun shot"
  | "klaxon horn"
  | "lions roar"
  | "lotus flute"
  | "megaphone"
  | "police whistle"
  | "siren"
  | "slide whistle"
  | "thunder sheet"
  | "wind machine"
  | "wind whistle";

export type GlassValue = "glass harmonica" | "glass harp" | "wind chimes";

export type HarmonyArrangement = "vertical" | "horizontal" | "diagonal";

export type HarmonyType = "explicit" | "implied" | "alternate";

export type KindValue =
  | "major"
  | "minor"
  | "augmented"
  | "diminished"
  | "dominant"
  | "major-seventh"
  | "minor-seventh"
  | "diminished-seventh"
  | "augmented-seventh"
  | "half-diminished"
  | "major-minor"
  | "major-sixth"
  | "minor-sixth"
  | "dominant-ninth"
  | "major-ninth"
  | "minor-ninth"
  | "dominant-11th"
  | "major-11th"
  | "minor-11th"
  | "dominant-13th"
  | "major-13th"
  | "minor-13th"
  | "suspended-second"
  | "suspended-fourth"
  | "Neapolitan"
  | "Italian"
  | "French"
  | "German"
  | "pedal"
  | "power"
  | "Tristan"
  | "other"
  | "none";

export type LineEnd = "up" | "down" | "both" | "arrow" | "none";

export type MeasureNumberingValue = "none" | "measure" | "system";

export type MembraneValue =
  | "bass drum"
  | "bass drum on side"
  | "bongos"
  | "Chinese tomtom"
  | "conga drum"
  | "cuica"
  | "goblet drum"
  | "Indo-American tomtom"
  | "Japanese tomtom"
  | "military drum"
  | "snare drum"
  | "snare drum snares off"
  | "tabla"
  | "tambourine"
  | "tenor drum"
  | "timbales"
  | "tomtom";

export type MetalValue =
  | "agogo"
  | "almglocken"
  | "bell"
  | "bell plate"
  | "bell tree"
  | "brake drum"
  | "cencerro"
  | "chain rattle"
  | "Chinese cymbal"
  | "cowbell"
  | "crash cymbals"
  | "crotale"
  | "cymbal tongs"
  | "domed gong"
  | "finger cymbals"
  | "flexatone"
  | "gong"
  | "hi-hat"
  | "high-hat cymbals"
  | "handbell"
  | "jaw harp"
  | "jingle bells"
  | "musical saw"
  | "shell bells"
  | "sistrum"
  | "sizzle cymbal"
  | "sleigh bells"
  | "suspended cymbal"
  | "tam tam"
  | "tam tam with beater"
  | "triangle"
  | "Vietnamese hat";

export type Milliseconds = number;

export type NumeralMode =
  | "major"
  | "minor"
  | "natural minor"
  | "melodic minor"
  | "harmonic minor";

export type OnOff = "on" | "off";

export type PedalType =
  | "start"
  | "stop"
  | "sostenuto"
  | "change"
  | "continue"
  | "discontinue"
  | "resume";

export type PitchedValue =
  | "celesta"
  | "chimes"
  | "glockenspiel"
  | "lithophone"
  | "mallet"
  | "marimba"
  | "steel drums"
  | "tubaphone"
  | "tubular chimes"
  | "vibraphone"
  | "xylophone";

export type PrincipalVoiceSymbol =
  | "Hauptstimme"
  | "Nebenstimme"
  | "plain"
  | "none";

export type StaffDivideSymbol = "down" | "up" | "up-down";

export type StartStopChangeContinue = "start" | "stop" | "change" | "continue";

export type SyncType =
  | "none"
  | "tempo"
  | "mostly-tempo"
  | "mostly-event"
  | "event"
  | "always-event";

export type SystemRelationNumber =
  | "only-top"
  | "only-bottom"
  | "also-top"
  | "also-bottom"
  | "none";

export type SystemRelation = "only-top" | "also-top" | "none";

export type TipDirection =
  | "up"
  | "down"
  | "left"
  | "right"
  | "northwest"
  | "northeast"
  | "southeast"
  | "southwest";

export type StickLocation = "center" | "rim" | "cymbal bell" | "cymbal edge";

export type StickMaterial = "soft" | "medium" | "hard" | "shaded" | "x";

export type StickType =
  | "bass drum"
  | "double bass drum"
  | "glockenspiel"
  | "gum"
  | "hammer"
  | "superball"
  | "timpani"
  | "wound"
  | "xylophone"
  | "yarn";

export type UpDownStopContinue = "up" | "down" | "stop" | "continue";

export type WedgeType = "crescendo" | "diminuendo" | "stop" | "continue";

export type WoodValue =
  | "bamboo scraper"
  | "board clapper"
  | "cabasa"
  | "castanets"
  | "castanets with handle"
  | "claves"
  | "football rattle"
  | "guiro"
  | "log drum"
  | "maraca"
  | "maracas"
  | "quijada"
  | "rainstick"
  | "ratchet"
  | "reco-reco"
  | "sandpaper blocks"
  | "slit drum"
  | "temple block"
  | "vibraslap"
  | "whip"
  | "wood block";

export type DistanceType = string;

export type GlyphType = string;

export type LineWidthType = string;

export type MarginType = "odd" | "even" | "both";

export type Millimeters = number;

export type NoteSizeType = "cue" | "grace" | "grace-cue" | "large";

export type AccidentalValue =
  | "sharp"
  | "natural"
  | "flat"
  | "double-sharp"
  | "sharp-sharp"
  | "flat-flat"
  | "natural-sharp"
  | "natural-flat"
  | "quarter-flat"
  | "quarter-sharp"
  | "three-quarters-flat"
  | "three-quarters-sharp"
  | "sharp-down"
  | "sharp-up"
  | "natural-down"
  | "natural-up"
  | "flat-down"
  | "flat-up"
  | "double-sharp-down"
  | "double-sharp-up"
  | "flat-flat-down"
  | "flat-flat-up"
  | "arrow-down"
  | "arrow-up"
  | "triple-sharp"
  | "triple-flat"
  | "slash-quarter-sharp"
  | "slash-sharp"
  | "slash-flat"
  | "double-slash-flat"
  | "sharp-1"
  | "sharp-2"
  | "sharp-3"
  | "sharp-5"
  | "flat-1"
  | "flat-2"
  | "flat-3"
  | "flat-4"
  | "sori"
  | "koron"
  | "other";

export type ArrowDirection =
  | "left"
  | "up"
  | "right"
  | "down"
  | "northwest"
  | "northeast"
  | "southeast"
  | "southwest"
  | "left right"
  | "up down"
  | "northwest southeast"
  | "northeast southwest"
  | "other";

export type ArrowStyle =
  | "single"
  | "double"
  | "filled"
  | "hollow"
  | "paired"
  | "combined"
  | "other";

export type BeamValue =
  | "begin"
  | "continue"
  | "end"
  | "forward hook"
  | "backward hook";

export type BendShape = "angled" | "curved";

export type BreathMarkValue = "" | "comma" | "tick" | "upbow" | "salzedo";

export type CaesuraValue =
  | "normal"
  | "thick"
  | "short"
  | "curved"
  | "single"
  | "";

export type CircularArrow = "clockwise" | "anticlockwise";

export type Fan = "accel" | "rit" | "none";

export type HandbellValue =
  | "belltree"
  | "damp"
  | "echo"
  | "gyro"
  | "hand martellato"
  | "mallet lift"
  | "mallet table"
  | "martellato"
  | "martellato lift"
  | "muted martellato"
  | "pluck lift"
  | "swing";

export type HarmonClosedLocation = "right" | "bottom" | "left" | "top";

export type HarmonClosedValue = "yes" | "no" | "half";

export type HoleClosedLocation = "right" | "bottom" | "left" | "top";

export type HoleClosedValue = "yes" | "no" | "half";

export type NoteTypeValue =
  | "1024th"
  | "512th"
  | "256th"
  | "128th"
  | "64th"
  | "32nd"
  | "16th"
  | "eighth"
  | "quarter"
  | "half"
  | "whole"
  | "breve"
  | "long"
  | "maxima";

export type NoteheadValue =
  | "slash"
  | "triangle"
  | "diamond"
  | "square"
  | "cross"
  | "x"
  | "circle-x"
  | "inverted triangle"
  | "arrow down"
  | "arrow up"
  | "circled"
  | "slashed"
  | "back slashed"
  | "normal"
  | "cluster"
  | "circle dot"
  | "left triangle"
  | "rectangle"
  | "none"
  | "do"
  | "re"
  | "mi"
  | "fa"
  | "fa up"
  | "so"
  | "la"
  | "ti"
  | "other";

export type Octave = number;

export type Semitones = number;

export type ShowTuplet = "actual" | "both" | "none";

export type StemValue = "down" | "up" | "double" | "none";

export type Step = "A" | "B" | "C" | "D" | "E" | "F" | "G";

export type Syllabic = "single" | "begin" | "end" | "middle";

export type TapHand = "left" | "right";

export type TremoloMarks = number;

export type GroupBarlineValue = "yes" | "no" | "Mensurstrich";

export type GroupSymbolValue = "none" | "brace" | "line" | "bracket" | "square";

export type MeasureText = string;

export type SwingTypeValue = "16th" | "eighth";

export class AccidentalText {}

export class Coda {}

export interface Song {
  title: string;
  chords: ChordLike[];
  key: Key;
  breakMeasures: number;
}

type MeasureOptions = {
  number: number;
  width?: number;
  implicit?: boolean;
  nonControlling?: boolean;
  attributes?: Attributes;
  notes?: Note[];
  directions?: Direction[];
  backup?: Backup[];
  forward?: Forward[];
  harmony?: Harmony[];
  print?: Print[];
  sound?: Sound[];
  barlines?: Barline[];
  otherMeasureElements?: string[];
  printNewSystem?: boolean;
};

export class Measure {
  public number: number; // Measure number
  public width?: number; // Optional width of the measure
  public implicit?: boolean; // Indicates if this is an implicit measure
  public nonControlling?: boolean; // Indicates if this measure is non-controlling
  public attributes?: Attributes; // Attributes (e.g., key, time, clef)
  public notes: Note[] = []; // Notes within the measure
  public directions?: Direction[]; // Directions like dynamics or tempo
  public backup?: Backup[]; // Backup elements for adjusting time
  public forward?: Forward[]; // Forward elements for adjusting time
  public harmony?: Harmony[]; // Harmony (chord symbols)
  public print?: Print[]; // Print instructions (e.g., system layout)
  public sound?: Sound[]; // Sound changes (e.g., tempo or dynamics)
  public barlines?: Barline[]; // Barline definitions
  public otherMeasureElements?: string[]; // Any custom elements for extensibility

  constructor({
    number,
    width,
    implicit,
    nonControlling,
    attributes,
    notes,
    directions,
    backup,
    forward,
    harmony,
    print,
    sound,
    barlines,
    otherMeasureElements,
  }: MeasureOptions) {
    this.number = number;
    this.width = width;
    this.implicit = implicit;
    this.nonControlling = nonControlling;
    this.attributes = attributes;
    this.notes = notes || [];
    this.directions = directions || [];
    this.backup = backup || [];
    this.forward = forward || [];
    this.harmony = harmony || [];
    this.print = print || [];
    this.sound = sound || [];
    this.barlines = barlines || [];
    this.otherMeasureElements = otherMeasureElements || [];
  }

  /**
   * Serialize to MusicXML.
   */
  public toXml(): string {
    const attributesXml = this.attributes?.toXml() || "";
    const notesXml = this.notes.map((note) => note.toXml()).join("");
    const directionsXml =
      this.directions?.map((direction) => direction.toXml()).join("") || "";
    const backupXml = this.backup?.map((b) => b.toXml()).join("") || "";
    const forwardXml = this.forward?.map((f) => f.toXml()).join("") || "";
    const harmonyXml = this.harmony?.map((h) => h.toXml()).join("") || "";
    const printXml = this.print?.map((p) => p.toXml()).join("") || "";
    const soundXml = this.sound?.map((s) => s.toXml()).join("") || "";
    const barlinesXml = this.barlines?.map((b) => b.toXml()).join("") || "";
    const otherXml = this.otherMeasureElements?.join("") || "";

    return `
    <measure number="${this.number}"${this.width !== undefined ? ` width="${this.width}"` : ""}${
      this.implicit ? ` implicit="yes"` : ""
    }${this.nonControlling ? ` non-controlling="yes"` : ""}>
      ${attributesXml}
      ${printXml}
      ${directionsXml}
      ${backupXml}
      ${forwardXml}
      ${harmonyXml}
      ${notesXml}
      ${soundXml}
      ${barlinesXml}
      ${otherXml}
    </measure>
    `;
  }
}

export class Dynamics {
  public forte?: boolean;
  public fortissimo?: boolean;
  public piano?: boolean;
  public pianissimo?: boolean;
  public mezzoForte?: boolean;
  public mezzoPiano?: boolean;
  public sfz?: boolean; // Sforzando
  public otherDynamics?: string;

  constructor({
    forte,
    fortissimo,
    piano,
    pianissimo,
    mezzoForte,
    mezzoPiano,
    sfz,
    otherDynamics,
  }: {
    forte?: boolean;
    fortissimo?: boolean;
    piano?: boolean;
    pianissimo?: boolean;
    mezzoForte?: boolean;
    mezzoPiano?: boolean;
    sfz?: boolean;
    otherDynamics?: string;
  }) {
    this.forte = forte;
    this.fortissimo = fortissimo;
    this.piano = piano;
    this.pianissimo = pianissimo;
    this.mezzoForte = mezzoForte;
    this.mezzoPiano = mezzoPiano;
    this.sfz = sfz;
    this.otherDynamics = otherDynamics;
  }

  public toXml(): string {
    return `
    <dynamics>
      ${this.forte ? `<f />` : ""}
      ${this.fortissimo ? `<ff />` : ""}
      ${this.piano ? `<p />` : ""}
      ${this.pianissimo ? `<pp />` : ""}
      ${this.mezzoForte ? `<mf />` : ""}
      ${this.mezzoPiano ? `<mp />` : ""}
      ${this.sfz ? `<sfz />` : ""}
      ${this.otherDynamics ? `<other-dynamics>${this.otherDynamics}</other-dynamics>` : ""}
    </dynamics>
    `;
  }
}

export class Empty {}

export class EmptyPlacement {}

export class EmptyPlacementSmufl {}

export class EmptyPrintStyle {}

export class EmptyPrintStyleAlign {}

export class EmptyPrintStyleAlignId {}

export class EmptyPrintObjectStyleAlign {}

export class EmptyTrillSound {}

export class HorizontalTurn {}

export class Fermata {
  public shape?: "normal" | "angled" | "square";
  public placement?: "above" | "below";

  constructor({
    shape,
    placement,
  }: {
    shape?: "normal" | "angled" | "square";
    placement?: "above" | "below";
  }) {
    this.shape = shape;
    this.placement = placement;
  }

  public toXml(): string {
    return `
    <fermata${this.placement ? ` placement="${this.placement}"` : ""}>
      ${this.shape || ""}
    </fermata>
    `;
  }
}

export class Fingering {}

export class FormattedSymbol {}

export class FormattedSymbolId {}

export class FormattedText {}

export class FormattedTextId {}

export class Fret {}

export class Level {}

export class MidiDevice {}

export class MidiInstrument {
  public midi_channel?: Midi16;
  public midi_name?: string;
  public midi_bank?: Midi16384;
  public midi_program?: Midi128;
  public midi_unpitched?: Midi128;
  public volume?: Percent;
  public pan?: RotationDegrees;
  public elevation?: RotationDegrees;
}

export class NameDisplay {
  public display_text?: FormattedText;
  public accidental_text?: AccidentalText;
}

export class OtherPlay {}

export class Play {
  public ipa?: string;
  public mute?: Mute;
  public semi_pitched?: SemiPitched;
  public other_play?: OtherPlay;
}

export class Segno {}

export class String {}

export class TypedText {}

export class WavyLine {
  public type: "start" | "stop" | "continue";

  constructor(type: "start" | "stop" | "continue") {
    this.type = type;
  }

  public toXml(): string {
    return `
    <wavy-line type="${this.type}" />
    `;
  }
}

export class Interchangeable {
  public symbol?: "common" | "cut"; // Optional symbol for interchangeable time
  public beats?: number;
  public beatType?: number;

  constructor({
    symbol,
    beats,
    beatType,
  }: {
    symbol?: "common" | "cut";
    beats?: number;
    beatType?: number;
  }) {
    this.symbol = symbol;
    this.beats = beats;
    this.beatType = beatType;
  }

  public toXml(): string {
    const beatsXml = this.beats ? `<beats>${this.beats}</beats>` : "";
    const beatTypeXml = this.beatType
      ? `<beat-type>${this.beatType}</beat-type>`
      : "";
    const symbolXml = this.symbol ? `<symbol>${this.symbol}</symbol>` : "";

    return `
    <interchangeable>
      ${symbolXml}
      ${beatsXml}
      ${beatTypeXml}
    </interchangeable>
    `;
  }
}

export class TimeSignature {
  public beats: number; // Number of beats per measure
  public beatType: number; // Beat type (e.g., 4 for quarter note, 8 for eighth note)
  public interchangeable?: Interchangeable; // Optional interchangeable time signature

  constructor({
    beats,
    beatType,
    interchangeable,
  }: {
    beats: number;
    beatType: number;
    interchangeable?: Interchangeable;
  }) {
    this.beats = beats;
    this.beatType = beatType;
    this.interchangeable = interchangeable;
  }

  public toXml(): string {
    const interchangeableXml = this.interchangeable?.toXml() || "";

    return `
    <time>
      <beats>${this.beats}</beats>
      <beat-type>${this.beatType}</beat-type>
      ${interchangeableXml}
    </time>
    `;
  }
}

export class Attributes {
  public divisions?: number;
  public key?: Key[];
  public time?: TimeSignature[];
  public staves?: number; // Number of staves
  public partSymbol?: PartSymbol; // Part symbol (e.g., bracket, brace)
  public instruments?: number; // Number of instruments
  public clef?: Clef[];
  public transpose?: Transpose[];
  public directive?: boolean; // Indicates directives are present

  constructor({
    divisions,
    key,
    time,
    staves,
    partSymbol,
    instruments,
    clef,
    transpose,
    directive,
  }: {
    divisions?: number;
    key?: Key[];
    time?: TimeSignature[];
    staves?: number;
    partSymbol?: PartSymbol;
    instruments?: number;
    clef?: Clef[];
    transpose?: Transpose[];
    directive?: boolean;
  }) {
    this.divisions = divisions;
    this.key = key || [];
    this.time = time || [];
    this.staves = staves;
    this.partSymbol = partSymbol;
    this.instruments = instruments;
    this.clef = clef || [];
    this.transpose = transpose || [];
    this.directive = directive;
  }

  public toXml(): string {
    const divisionsXml = this.divisions
      ? `<divisions>${this.divisions}</divisions>`
      : "";
    const keysXml = this.key?.map((k) => k.toXml()).join("") || "";
    const timesXml = this.time?.map((t) => t.toXml()).join("") || "";
    const stavesXml = this.staves ? `<staves>${this.staves}</staves>` : "";
    const partSymbolXml = this.partSymbol?.toXml() || "";
    const instrumentsXml = this.instruments
      ? `<instruments>${this.instruments}</instruments>`
      : "";
    const clefsXml = this.clef?.map((c) => c.toXml()).join("") || "";
    const transposesXml = this.transpose?.map((t) => t.toXml()).join("") || "";
    const directiveXml = this.directive
      ? `<directive>${this.directive}</directive>`
      : "";

    return `
    <attributes>
      ${divisionsXml}
      ${keysXml}
      ${timesXml}
      ${stavesXml}
      ${partSymbolXml}
      ${instrumentsXml}
      ${clefsXml}
      ${transposesXml}
      ${directiveXml}
    </attributes>
    `;
  }
}

export class BeatRepeat {}

export class Cancel {}

export class PrintStyleAlign {
  // Print style attributes
  public defaultX?: number;
  public defaultY?: number;
  public relativeX?: number;
  public relativeY?: number;
  public color?: string;
  public fontFamily?: string;
  public fontStyle?: "normal" | "italic";
  public fontSize?: string;
  public fontWeight?: "normal" | "bold";

  // Alignment attributes
  public halign?: "left" | "center" | "right";
  public valign?: "top" | "middle" | "bottom" | "baseline";

  constructor({
    defaultX,
    defaultY,
    relativeX,
    relativeY,
    color,
    fontFamily,
    fontStyle,
    fontSize,
    fontWeight,
    halign,
    valign,
  }: {
    defaultX?: number;
    defaultY?: number;
    relativeX?: number;
    relativeY?: number;
    color?: string;
    fontFamily?: string;
    fontStyle?: "normal" | "italic";
    fontSize?: string;
    fontWeight?: "normal" | "bold";
    halign?: "left" | "center" | "right";
    valign?: "top" | "middle" | "bottom" | "baseline";
  }) {
    this.defaultX = defaultX;
    this.defaultY = defaultY;
    this.relativeX = relativeX;
    this.relativeY = relativeY;
    this.color = color;
    this.fontFamily = fontFamily;
    this.fontStyle = fontStyle;
    this.fontSize = fontSize;
    this.fontWeight = fontWeight;
    this.halign = halign;
    this.valign = valign;
  }

  public toXml(): string {
    const attributes = [
      this.defaultX !== undefined ? `default-x="${this.defaultX}"` : "",
      this.defaultY !== undefined ? `default-y="${this.defaultY}"` : "",
      this.relativeX !== undefined ? `relative-x="${this.relativeX}"` : "",
      this.relativeY !== undefined ? `relative-y="${this.relativeY}"` : "",
      this.color ? `color="${this.color}"` : "",
      this.fontFamily ? `font-family="${this.fontFamily}"` : "",
      this.fontStyle ? `font-style="${this.fontStyle}"` : "",
      this.fontSize ? `font-size="${this.fontSize}"` : "",
      this.fontWeight ? `font-weight="${this.fontWeight}"` : "",
      this.halign ? `halign="${this.halign}"` : "",
      this.valign ? `valign="${this.valign}"` : "",
    ]
      .filter((attr) => attr !== "")
      .join(" ");

    return attributes ? ` ${attributes}` : "";
  }
}

export class Clef {
  public sign: "G" | "F" | "C" | "percussion" | "TAB" | "jianpu" | "none"; // Clef sign
  public line?: number; // Staff line (1-5 for standard clefs)
  public clefOctaveChange?: number; // Octave transposition (+1, -1, etc.)
  public number?: number; // Clef number (used for staves with multiple clefs)
  public additional?: boolean; // Indicates an additional clef
  public size?: "full" | "cue" | "large"; // Clef size
  public afterBarline?: boolean; // Indicates clef appears after a barline
  public color?: string; // CSS-style color
  public printStyleAlign?: PrintStyleAlign; // Optional print style and alignment

  constructor({
    sign,
    line,
    clefOctaveChange,
    number,
    additional,
    size,
    afterBarline,
    color,
    printStyleAlign,
  }: {
    sign: "G" | "F" | "C" | "percussion" | "TAB" | "jianpu" | "none";
    line?: number;
    clefOctaveChange?: number;
    number?: number;
    additional?: boolean;
    size?: "full" | "cue" | "large";
    afterBarline?: boolean;
    color?: string;
    printStyleAlign?: PrintStyleAlign;
  }) {
    this.sign = sign;
    this.line = line;
    this.clefOctaveChange = clefOctaveChange;
    this.number = number;
    this.additional = additional;
    this.size = size;
    this.afterBarline = afterBarline;
    this.color = color;
    this.printStyleAlign = printStyleAlign;
  }

  public toXml(): string {
    const attributes = [
      this.number !== undefined ? `number="${this.number}"` : "",
      this.additional ? 'additional="yes"' : "",
      this.size ? `size="${this.size}"` : "",
      this.afterBarline ? 'after-barline="yes"' : "",
      this.color ? `color="${this.color}"` : "",
    ]
      .filter((attr) => attr !== "")
      .join(" ");

    const printStyleAlignXml = this.printStyleAlign?.toXml() || "";

    return `
    <clef ${attributes}>
      <sign>${this.sign}</sign>
      ${this.line !== undefined ? `<line>${this.line}</line>` : ""}
      ${this.clefOctaveChange !== undefined ? `<clef-octave-change>${this.clefOctaveChange}</clef-octave-change>` : ""}
      ${printStyleAlignXml}
    </clef>
    `;
  }
}

export class Double {}

export class ForPart {
  public part_clef?: PartClef;
  public part_transpose?: PartTranspose;
}

export class Key {
  public fifths: number;
  public mode?: string; // e.g., "major" or "minor"

  constructor(fifths: number, mode?: string) {
    this.fifths = fifths;
    this.mode = mode;
  }

  public toXml(): string {
    return `
    <key>
      <fifths>${this.fifths}</fifths>
      ${this.mode ? `<mode>${this.mode}</mode>` : ""}
    </key>
    `;
  }
}

export class KeyAccidental {}

export class KeyOctave {}

export class LineDetail {}

export class MeasureRepeat {}

export class MeasureStyle {
  public multiple_rest?: MultipleRest;
  public measure_repeat?: MeasureRepeat;
  public beat_repeat?: BeatRepeat;
  public slash?: Slash;
}

export class MultipleRest {}

export class PartClef {}

export class PartSymbol {
  public type: "none" | "brace" | "line" | "bracket" | "square";
  public topStaff?: number; // Indicates the top staff number in the group
  public bottomStaff?: number; // Indicates the bottom staff number in the group
  public color?: string; // CSS-style color (e.g., "#FFFFFF" or "white")
  public defaultX?: number; // Default horizontal position
  public defaultY?: number; // Default vertical position
  public relativeX?: number; // Relative horizontal position
  public relativeY?: number; // Relative vertical position
  public fontFamily?: string; // Font family for the symbol
  public fontStyle?: "normal" | "italic"; // Font style
  public fontSize?: string; // Font size (e.g., "12pt", "small")
  public fontWeight?: "normal" | "bold"; // Font weight

  constructor({
    type,
    topStaff,
    bottomStaff,
    color,
    defaultX,
    defaultY,
    relativeX,
    relativeY,
    fontFamily,
    fontStyle,
    fontSize,
    fontWeight,
  }: {
    type: "none" | "brace" | "line" | "bracket" | "square";
    topStaff?: number;
    bottomStaff?: number;
    color?: string;
    defaultX?: number;
    defaultY?: number;
    relativeX?: number;
    relativeY?: number;
    fontFamily?: string;
    fontStyle?: "normal" | "italic";
    fontSize?: string;
    fontWeight?: "normal" | "bold";
  }) {
    this.type = type;
    this.topStaff = topStaff;
    this.bottomStaff = bottomStaff;
    this.color = color;
    this.defaultX = defaultX;
    this.defaultY = defaultY;
    this.relativeX = relativeX;
    this.relativeY = relativeY;
    this.fontFamily = fontFamily;
    this.fontStyle = fontStyle;
    this.fontSize = fontSize;
    this.fontWeight = fontWeight;
  }

  /**
   * Converts the `PartSymbol` object to MusicXML.
   */
  public toXml(): string {
    const attributes = [
      `type="${this.type}"`,
      this.topStaff !== undefined ? `top-staff="${this.topStaff}"` : "",
      this.bottomStaff !== undefined
        ? `bottom-staff="${this.bottomStaff}"`
        : "",
      this.color ? `color="${this.color}"` : "",
      this.defaultX !== undefined ? `default-x="${this.defaultX}"` : "",
      this.defaultY !== undefined ? `default-y="${this.defaultY}"` : "",
      this.relativeX !== undefined ? `relative-x="${this.relativeX}"` : "",
      this.relativeY !== undefined ? `relative-y="${this.relativeY}"` : "",
      this.fontFamily ? `font-family="${this.fontFamily}"` : "",
      this.fontStyle ? `font-style="${this.fontStyle}"` : "",
      this.fontSize ? `font-size="${this.fontSize}"` : "",
      this.fontWeight ? `font-weight="${this.fontWeight}"` : "",
    ]
      .filter((attr) => attr !== "")
      .join(" ");

    return `<part-symbol ${attributes} />`;
  }
}

export class PartTranspose {}

export class Slash {}

export class StaffDetails {
  public staff_type?: StaffType;
  public staff_lines?: number;
  public line_detail?: LineDetail;
  public staff_tuning?: StaffTuning;
  public capo?: number;
  public staff_size?: StaffSize;
}

export class StaffSize {}

export class StaffTuning {}

export class Time {
  public interchangeable?: Interchangeable;
  public senza_misura?: string;
}

export class Transpose {
  public diatonic?: number; // Number of diatonic steps
  public chromatic?: number; // Number of chromatic steps
  public octaveChange?: number; // Octave transposition (+1, -1, etc.)
  public double?: boolean; // Indicates a double transposition
  public color?: string; // CSS-style color
  public printStyleAlign?: PrintStyleAlign; // Optional print style and alignment

  constructor({
    diatonic,
    chromatic,
    octaveChange,
    double,
    color,
    printStyleAlign,
  }: {
    diatonic?: number;
    chromatic?: number;
    octaveChange?: number;
    double?: boolean;
    color?: string;
    printStyleAlign?: PrintStyleAlign;
  }) {
    this.diatonic = diatonic;
    this.chromatic = chromatic;
    this.octaveChange = octaveChange;
    this.double = double;
    this.color = color;
    this.printStyleAlign = printStyleAlign;
  }

  public toXml(): string {
    const attributes = [
      this.double ? 'double="yes"' : "",
      this.color ? `color="${this.color}"` : "",
    ]
      .filter((attr) => attr !== "")
      .join(" ");

    const printStyleAlignXml = this.printStyleAlign?.toXml() || "";

    return `
    <transpose ${attributes}>
      ${this.diatonic !== undefined ? `<diatonic>${this.diatonic}</diatonic>` : ""}
      ${this.chromatic !== undefined ? `<chromatic>${this.chromatic}</chromatic>` : ""}
      ${this.octaveChange !== undefined ? `<octave-change>${this.octaveChange}</octave-change>` : ""}
      ${printStyleAlignXml}
    </transpose>
    `;
  }
}

export class BarStyleColor {}

export class Barline {
  public location: "left" | "right";
  public barStyle?:
    | "regular"
    | "dotted"
    | "dashed"
    | "heavy"
    | "light-light"
    | "light-heavy"
    | "heavy-light"
    | "heavy-heavy"
    | "tick"
    | "short"
    | "none";
  public repeat?: "forward" | "backward";
  public ending?: Ending;
  public segno?: string; // Marks a segno
  public coda?: string; // Marks a coda
  public fermata?: Fermata; // Fermata on the barline
  public wavyLine?: WavyLine; // Wavy line on the barline
  public footnote?: string; // Optional footnote
  public level?: string; // Editorial level

  constructor({
    location,
    barStyle,
    repeat,
    ending,
    segno,
    coda,
    fermata,
    wavyLine,
    footnote,
    level,
  }: {
    location: "left" | "right";
    barStyle?:
      | "regular"
      | "dotted"
      | "dashed"
      | "heavy"
      | "light-light"
      | "light-heavy"
      | "heavy-light"
      | "heavy-heavy"
      | "tick"
      | "short"
      | "none";
    repeat?: "forward" | "backward";
    ending?: Ending;
    segno?: string;
    coda?: string;
    fermata?: Fermata;
    wavyLine?: WavyLine;
    footnote?: string;
    level?: string;
  }) {
    this.location = location;
    this.barStyle = barStyle;
    this.repeat = repeat;
    this.ending = ending;
    this.segno = segno;
    this.coda = coda;
    this.fermata = fermata;
    this.wavyLine = wavyLine;
    this.footnote = footnote;
    this.level = level;
  }

  public toXml(): string {
    const barStyleXml = this.barStyle
      ? `<bar-style>${this.barStyle}</bar-style>`
      : "";
    const repeatXml = this.repeat
      ? `<repeat direction="${this.repeat}" />`
      : "";
    const endingXml = this.ending?.toXml() || "";
    const segnoXml = this.segno ? `<segno>${this.segno}</segno>` : "";
    const codaXml = this.coda ? `<coda>${this.coda}</coda>` : "";
    const fermataXml = this.fermata?.toXml() || "";
    const wavyLineXml = this.wavyLine?.toXml() || "";
    const footnoteXml = this.footnote
      ? `<footnote>${this.footnote}</footnote>`
      : "";
    const levelXml = this.level ? `<level>${this.level}</level>` : "";

    return `
    <barline location="${this.location}">
      ${barStyleXml}
      ${repeatXml}
      ${endingXml}
      ${segnoXml}
      ${codaXml}
      ${fermataXml}
      ${wavyLineXml}
      ${footnoteXml}
      ${levelXml}
    </barline>
    `;
  }
}

export class Ending {
  public number: string; // E.g., "1", "2"
  public type: "start" | "stop" | "discontinue";
  public text?: string; // Optional text for the ending

  constructor({
    number,
    type,
    text,
  }: {
    number: string;
    type: "start" | "stop" | "discontinue";
    text?: string;
  }) {
    this.number = number;
    this.type = type;
    this.text = text;
  }

  public toXml(): string {
    return `
    <ending number="${this.number}" type="${this.type}">
      ${this.text || ""}
    </ending>
    `;
  }
}

export class Repeat {}

export class Accord {}

export class AccordionRegistration {
  public accordion_high?: Empty;
  public accordion_middle?: AccordionMiddle;
  public accordion_low?: Empty;
}

export class Barre {}

export class HarmonyAlter {}

export class BassStep {}

export class Beater {}

export class BeatUnitTied {}

export class Bracket {}

export class Dashes {}

export class DegreeAlter {}

export class DegreeType {}

export class DegreeValue {}

export class Direction {
  public placement?: "above" | "below";
  public dynamics?: Dynamics;
  public tempo?: number;
  public words?: string; // Performance text
  public rehearsal?: string; // Rehearsal marks
  public wedge?: Wedge; // Crescendo/decrescendo
  public segno?: string;
  public coda?: string;
  public fermata?: Fermata;
  public otherDirection?: string;

  constructor({
    placement,
    dynamics,
    tempo,
    words,
    rehearsal,
    wedge,
    segno,
    coda,
    fermata,
    otherDirection,
  }: {
    placement?: "above" | "below";
    dynamics?: Dynamics;
    tempo?: number;
    words?: string;
    rehearsal?: string;
    wedge?: Wedge;
    segno?: string;
    coda?: string;
    fermata?: Fermata;
    otherDirection?: string;
  }) {
    this.placement = placement;
    this.dynamics = dynamics;
    this.tempo = tempo;
    this.words = words;
    this.rehearsal = rehearsal;
    this.wedge = wedge;
    this.segno = segno;
    this.coda = coda;
    this.fermata = fermata;
    this.otherDirection = otherDirection;
  }

  public toXml(): string {
    return `
    <direction>
      ${this.placement ? `<placement>${this.placement}</placement>` : ""}
      ${this.dynamics?.toXml() || ""}
      ${this.tempo !== undefined ? `<sound tempo="${this.tempo}" />` : ""}
      ${this.words ? `<words>${this.words}</words>` : ""}
      ${this.rehearsal ? `<rehearsal>${this.rehearsal}</rehearsal>` : ""}
      ${this.wedge?.toXml() || ""}
      ${this.segno ? `<segno>${this.segno}</segno>` : ""}
      ${this.coda ? `<coda>${this.coda}</coda>` : ""}
      ${this.fermata?.toXml() || ""}
      ${this.otherDirection ? `<other-direction>${this.otherDirection}</other-direction>` : ""}
    </direction>
    `;
  }
}

export class DirectionType {
  public rehearsal?: FormattedTextId;
  public segno?: Segno;
  public coda?: Coda;
  public words?: FormattedTextId;
  public symbol?: FormattedSymbolId;
  public wedge?: Wedge;
  public dynamics?: Dynamics;
  public dashes?: Dashes;
  public bracket?: Bracket;
  public pedal?: Pedal;
  public metronome?: Metronome;
  public octave_shift?: OctaveShift;
  public harp_pedals?: HarpPedals;
  public damp?: EmptyPrintStyleAlignId;
  public damp_all?: EmptyPrintStyleAlignId;
  public eyeglasses?: EmptyPrintStyleAlignId;
  public string_mute?: StringMute;
  public scordatura?: Scordatura;
  public image?: Image;
  public principal_voice?: PrincipalVoice;
  public percussion?: Percussion;
  public accordion_registration?: AccordionRegistration;
  public staff_divide?: StaffDivide;
  public other_direction?: OtherDirection;
}

export class Effect {}

export class Feature {}

export class FirstFret {}

export class Frame {
  public frame_strings?: number;
  public frame_frets?: number;
  public first_fret?: FirstFret;
  public frame_note?: FrameNote;
}

export class FrameNote {
  public string?: string;
  public fret?: Fret;
  public fingering?: Fingering;
  public barre?: Barre;
}

export class Glass {}

export class Grouping {
  public feature?: Feature;
}

export class Harmony {
  public root: Root;
  public kind: HarmonyKind;
  public bass?: Bass;
  public degree?: Degree[];
  public offset?: Offset;

  constructor({
    root,
    kind,
    bass,
    degree,
    offset,
  }: {
    root: Root;
    kind: HarmonyKind;
    bass?: Bass;
    degree?: Degree[];
    offset?: Offset;
  }) {
    this.root = root;
    this.kind = kind;
    this.bass = bass;
    this.degree = degree || [];
    this.offset = offset;
  }

  public toXml(): string {
    const degreesXml = this.degree?.map((d) => d.toXml()).join("") || "";
    return `
    <harmony>
      ${this.root.toXml()}
      ${this.kind.toXml()}
      ${this.bass?.toXml() || ""}
      ${degreesXml}
      ${this.offset?.toXml() ?? ""}
    </harmony>
    `;
  }
}

export class Root {
  public step: string;
  public alter?: number;

  constructor(step: string, alter?: number) {
    this.step = step;
    this.alter = alter;
  }

  public toXml(): string {
    return `
    <root>
      <root-step>${this.step}</root-step>
      ${this.alter !== undefined ? `<root-alter>${this.alter}</root-alter>` : ""}
    </root>
    `;
  }
}

export class HarmonyKind {
  public text: string;
  public useSymbols?: boolean;

  constructor(text: string, useSymbols?: boolean) {
    this.text = text;
    this.useSymbols = useSymbols;
  }

  public toXml(): string {
    return `
    <kind${this.useSymbols ? ' use-symbols="yes"' : ""}>${this.text}</kind>
    `;
  }
}

export class Bass {
  public step: string;
  public alter?: number;

  constructor(step: string, alter?: number) {
    this.step = step;
    this.alter = alter;
  }

  public toXml(): string {
    return `
    <bass>
      <bass-step>${this.step}</bass-step>
      ${this.alter !== undefined ? `<bass-alter>${this.alter}</bass-alter>` : ""}
    </bass>
    `;
  }
}

export class Degree {
  public value: number;
  public alter: number;
  public type: "add" | "alter" | "subtract";

  constructor(
    value: number,
    alter: number,
    type: "add" | "alter" | "subtract",
  ) {
    this.value = value;
    this.alter = alter;
    this.type = type;
  }

  public toXml(): string {
    return `
    <degree>
      <degree-value>${this.value}</degree-value>
      <degree-alter>${this.alter}</degree-alter>
      <degree-type>${this.type}</degree-type>
    </degree>
    `;
  }
}

export class HarpPedals {
  public pedal_tuning?: PedalTuning;
}

export class Image {}

export class InstrumentChange {}

export class Inversion {}

export class Kind {}

export class Listening {
  public sync?: Sync;
  public other_listening?: OtherListening;
  public offset?: Offset;
}

export class MeasureNumbering {}

export class Membrane {}

export class Metal {}

export class Metronome {
  public beat_unit_tied?: BeatUnitTied;
  public per_minute?: PerMinute;
  public metronome_arrows?: Empty;
  public metronome_note?: MetronomeNote;
  public metronome_relation?: string;
}

export class MetronomeBeam {}

export class MetronomeNote {
  public metronome_type?: NoteTypeValue;
  public metronome_dot?: Empty;
  public metronome_beam?: MetronomeBeam;
  public metronome_tied?: MetronomeTied;
  public metronome_tuplet?: MetronomeTuplet;
}

export class MetronomeTied {}

export class MetronomeTuplet {}

export class Numeral {
  public numeral_root?: NumeralRoot;
  public numeral_alter?: HarmonyAlter;
  public numeral_key?: NumeralKey;
}

export class NumeralKey {
  public numeral_fifths?: Fifths;
  public numeral_mode?: NumeralMode;
}

export class NumeralRoot {}

export class OctaveShift {}

export class Offset {
  /**
   * Value of the offset in divisions.
   */
  public value: number;

  /**
   * Specifies if the offset is sound-related or visual-related.
   */
  public sound?: boolean;

  constructor(value: number, sound?: boolean) {
    if (value < 0) {
      throw new Error("Offset value cannot be negative.");
    }
    this.value = value;
    this.sound = sound;
  }

  public toXml(): string {
    const soundAttribute =
      this.sound !== undefined ? ` sound=\"${this.sound ? "yes" : "no"}\"` : "";
    return `<offset${soundAttribute}>${this.value}</offset>`;
  }
}

export class OtherDirection {}

export class OtherListening {}

export class Pedal {}

export class PedalTuning {
  public pedal_step?: Step;
  public pedal_alter?: Semitones;
}

export class PerMinute {}

export class Percussion {
  public glass?: Glass;
  public metal?: Metal;
  public wood?: Wood;
  public pitched?: Pitched;
  public membrane?: Membrane;
  public effect?: Effect;
  public timpani?: Timpani;
  public beater?: Beater;
  public stick?: Stick;
  public stick_location?: StickLocation;
  public other_percussion?: OtherText;
}

export class Pitched {}

export class PrincipalVoice {}

export class Print {
  public newSystem?: boolean;
  public newPage?: boolean;
  public staffSpacing?: number;

  constructor({
    newSystem,
    newPage,
    staffSpacing,
  }: {
    newSystem?: boolean;
    newPage?: boolean;
    staffSpacing?: number;
  }) {
    this.newSystem = newSystem;
    this.newPage = newPage;
    this.staffSpacing = staffSpacing;
  }

  public toXml(): string {
    return `
    <print${this.newSystem ? ' new-system="yes"' : ""}${
      this.newPage ? ' new-page="yes"' : ""
    }>
      ${this.staffSpacing ? `<staff-spacing>${this.staffSpacing}</staff-spacing>` : ""}
    </print>
  `;
  }
}

export class SystemLayout {
  public systemDistance?: number; // Distance between systems
  public topSystemDistance?: number; // Distance from top margin

  constructor(systemDistance?: number, topSystemDistance?: number) {
    this.systemDistance = systemDistance;
    this.topSystemDistance = topSystemDistance;
  }

  public toXml(): string {
    return `
    <system-layout>
      ${this.systemDistance ? `<system-distance>${this.systemDistance}</system-distance>` : ""}
      ${this.topSystemDistance ? `<top-system-distance>${this.topSystemDistance}</top-system-distance>` : ""}
    </system-layout>
    `;
  }
}

export class RootStep {}

export class Scordatura {
  public accord?: Accord;
}

export class Sound {
  public tempo?: number;
  public dynamics?: number;
  public dacapo?: boolean;
  public segno?: string;
  public coda?: string;

  constructor({
    tempo,
    dynamics,
    dacapo,
    segno,
    coda,
  }: {
    tempo?: number;
    dynamics?: number;
    dacapo?: boolean;
    segno?: string;
    coda?: string;
  }) {
    this.tempo = tempo;
    this.dynamics = dynamics;
    this.dacapo = dacapo;
    this.segno = segno;
    this.coda = coda;
  }

  public toXml(): string {
    return `
    <sound${this.tempo !== undefined ? ` tempo="${this.tempo}"` : ""}${
      this.dynamics !== undefined ? ` dynamics="${this.dynamics}"` : ""
    }${this.dacapo ? ' dacapo="yes"' : ""}${this.segno ? ` segno="${this.segno}"` : ""}${
      this.coda ? ` coda="${this.coda}"` : ""
    } />
    `;
  }
}

export class StaffDivide {}

export class Stick {
  public stick_type?: StickType;
  public stick_material?: StickMaterial;
}

export class StringMute {}

export class Swing {
  public straight?: Empty;
  public first?: number;
  public second?: number;
  public swing_type?: SwingTypeValue;
  public swing_style?: string;
}

export class Sync {}

export class Timpani {}

export class Wedge {
  public type: "crescendo" | "diminuendo" | "stop" | "continue";
  public spread?: number; // Opening width of the wedge in tenths
  public niente?: boolean; // Indicates a niente mark
  public color?: string; // CSS-style color
  public dashedFormatting?: DashedFormatting; // Dashed line formatting

  constructor({
    type,
    spread,
    niente,
    color,
    dashedFormatting,
  }: {
    type: "crescendo" | "diminuendo" | "stop" | "continue";
    spread?: number;
    niente?: boolean;
    color?: string;
    dashedFormatting?: DashedFormatting;
  }) {
    this.type = type;
    this.spread = spread;
    this.niente = niente;
    this.color = color;
    this.dashedFormatting = dashedFormatting;
  }

  public toXml(): string {
    const attributes = [
      `type="${this.type}"`,
      this.spread !== undefined ? `spread="${this.spread}"` : "",
      this.niente ? 'niente="yes"' : "",
      this.color ? `color="${this.color}"` : "",
    ]
      .filter((attr) => attr !== "")
      .join(" ");

    const dashedFormattingXml = this.dashedFormatting?.toXml() || "";

    return `
    <wedge ${attributes}>
      ${dashedFormattingXml}
    </wedge>
    `;
  }
}

export class DashedFormatting {
  public dashLength?: number; // Length of dashes
  public spaceLength?: number; // Length of spaces between dashes

  constructor(dashLength?: number, spaceLength?: number) {
    this.dashLength = dashLength;
    this.spaceLength = spaceLength;
  }

  public toXml(): string {
    return `
    <dashed-formatting>
      ${this.dashLength !== undefined ? `<dash-length>${this.dashLength}</dash-length>` : ""}
      ${this.spaceLength !== undefined ? `<space-length>${this.spaceLength}</space-length>` : ""}
    </dashed-formatting>
    `;
  }
}

export class Wood {}

export class Encoding {
  public encoding_date?: YyyyMmDd;
  public encoder?: TypedText;
  public software?: string;
  public encoding_description?: string;
  public supports?: Supports;
}

export class Identification {
  public creator?: TypedText;
  public rights?: TypedText;
  public encoding?: Encoding;
  public source?: string;
  public relation?: TypedText;
  public miscellaneous?: Miscellaneous;
}

export class Miscellaneous {
  public miscellaneous_field?: MiscellaneousField;
}

export class MiscellaneousField {}

export class Supports {}

export class Appearance {
  public line_width?: LineWidth;
  public note_size?: NoteSize;
  public distance?: Distance;
  public glyph?: Glyph;
  public other_appearance?: OtherAppearance;
}

export class Distance {}

export class Glyph {}

export class LineWidth {}

export class MeasureLayout {
  public measure_distance?: Tenths;
}

export class NoteSize {}

export class OtherAppearance {}

export class PageLayout {
  public page_height?: Tenths;
  public page_width?: Tenths;
  public page_margins?: PageMargins;
}

export class PageMargins {}

export class Scaling {
  public millimeters?: Millimeters;
  public tenths?: Tenths;
}

export class StaffLayout {
  public staff_distance?: Tenths;
}

export class SystemDividers {
  public left_divider?: EmptyPrintObjectStyleAlign;
  public right_divider?: EmptyPrintObjectStyleAlign;
}

export class SystemMargins {}

export class Bookmark {}

export class Link {}

export enum Accidental {
  Sharp = "sharp",
  Flat = "flat",
  Natural = "natural",
  DoubleSharp = "double-sharp",
  DoubleFlat = "double-flat",
  QuarterSharp = "quarter-sharp",
  QuarterFlat = "quarter-flat",
}

export class AccidentalMark {}

export class Arpeggiate {}

export class Articulations {
  public staccato?: boolean;
  public tenuto?: boolean;
  public accent?: boolean;

  constructor({
    staccato,
    tenuto,
    accent,
  }: {
    staccato?: boolean;
    tenuto?: boolean;
    accent?: boolean;
  }) {
    this.staccato = staccato;
    this.tenuto = tenuto;
    this.accent = accent;
  }

  public toXml(): string {
    return `
    <articulations>
      ${this.staccato ? `<staccato />` : ""}
      ${this.tenuto ? `<tenuto />` : ""}
      ${this.accent ? `<accent />` : ""}
    </articulations>
    `;
  }
}

export class Arrow {
  public arrow_direction?: ArrowDirection;
  public arrow_style?: ArrowStyle;
  public arrowhead?: Empty;
  public circular_arrow?: CircularArrow;
}

export class Assess {}

export class Backup {
  public duration: number;

  constructor(duration: number) {
    this.duration = duration;
  }

  public toXml(): string {
    return `
    <backup>
      <duration>${this.duration}</duration>
    </backup>
    `;
  }
}

export class Bend {
  public bend_alter?: Semitones;
  public pre_bend?: Empty;
  public release?: Release;
  public with_bar?: PlacementText;
}

export class BreathMark {}

export class Caesura {}

export class Elision {}

export class EmptyLine {}

export class Extend {}

export class Figure {
  public prefix?: StyleText;
  public figure_number?: StyleText;
  public suffix?: StyleText;
  public extend?: Extend;
}

export class FiguredBass {
  public figure?: Figure;
}

export class Forward {
  public duration: number;

  constructor(duration: number) {
    this.duration = duration;
  }

  public toXml(): string {
    return `
    <forward>
      <duration>${this.duration}</duration>
    </forward>
    `;
  }
}

export class Glissando {}

export class Grace {
  public stealTimePrevious?: number;
  public stealTimeFollowing?: number;

  public toXml(): string {
    return `
    <grace 
      ${this.stealTimePrevious !== undefined ? `steal-time-previous="${this.stealTimePrevious}"` : ""}
      ${this.stealTimeFollowing !== undefined ? `steal-time-following="${this.stealTimeFollowing}"` : ""}
    />
    `;
  }
}

export class HammerOnPullOff {}

export class Handbell {}

export class HarmonClosed {}

export class HarmonMute {
  public harmon_closed?: HarmonClosed;
}

export class Harmonic {
  public natural?: Empty;
  public artificial?: Empty;
  public base_pitch?: Empty;
  public touching_pitch?: Empty;
  public sounding_pitch?: Empty;
}

export class HeelToe {}

export class Hole {
  public hole_type?: string;
  public hole_closed?: HoleClosed;
  public hole_shape?: string;
}

export class HoleClosed {}

export class Instrument {}

export class Listen {
  public assess?: Assess;
  public wait?: Wait;
  public other_listen?: OtherListening;
}

export class Lyric {
  public text: string;
  public syllabic?: "single" | "begin" | "end" | "middle";

  constructor(text: string, syllabic?: "single" | "begin" | "end" | "middle") {
    this.text = text;
    this.syllabic = syllabic;
  }

  public toXml(): string {
    return `
    <lyric>
      ${this.syllabic ? `<syllabic>${this.syllabic}</syllabic>` : ""}
      <text>${this.text}</text>
    </lyric>
    `;
  }
}

export class Mordent {}

export class NonArpeggiate {}

export class Notations {
  public tied?: Tied[]; // List of tied elements

  public articulations?: Articulations;
  public dynamics?: Dynamics;
  public slurs?: Slur[];
  public ornaments?: Ornaments;
  public technical?: Technical;

  constructor({
    tied,
    articulations,
    dynamics,
    slurs,
    ornaments,
    technical,
  }: {
    tied?: Tied[];
    articulations?: Articulations;
    dynamics?: Dynamics;
    slurs?: Slur[];
    ornaments?: Ornaments;
    technical?: Technical;
  }) {
    this.articulations = articulations;
    this.dynamics = dynamics;
    this.slurs = slurs;
    this.ornaments = ornaments;
    this.technical = technical;
    this.tied = tied;
  }

  public toXml(): string {
    const tiedXml = this.tied
      ? this.tied.map((tie) => tie.toXml()).join("\n")
      : "";
    const articulationsXml = this.articulations?.toXml() || "";
    const dynamicsXml = this.dynamics?.toXml() || "";
    const slursXml = this.slurs?.map((slur) => slur.toXml()).join("") || "";
    const ornamentsXml = this.ornaments?.toXml() || "";
    const technicalXml = this.technical?.toXml() || "";

    return `
    <notations>
      ${tiedXml}
      ${articulationsXml}
      ${dynamicsXml}
      ${slursXml}
      ${ornamentsXml}
      ${technicalXml}
    </notations>
    `;
  }
}

export class Beam {
  public number: number; // Beam number (1 = primary beam, 2 = secondary, etc.)
  public type: BeamValue; // Beam type

  constructor(number: number, type: BeamValue) {
    if (number < 1 || number > 8) {
      throw new Error("Beam number must be between 1 and 8.");
    }
    this.number = number;
    this.type = type;
  }

  /**
   * Serialize this beam to MusicXML-compatible XML.
   */
  public toXml(): string {
    return `<beam number="${this.number}">${this.type}</beam>`;
  }

  /**
   * Deserialize an XML element into a Beam object.
   */
  public static fromXml(xml: Element): Beam {
    const number = parseInt(xml.getAttribute("number") || "1", 10);
    const type = xml.textContent as BeamValue;
    return new Beam(number, type);
  }
}

export class Note {
  public pitch?: Pitch; // Reference to the pitch class
  public duration?: number; // Duration of the note
  public type?: NoteType; // Type of the note (e.g., quarter, eighth)
  public dot?: number; // Number of dots (e.g., dotted quarter note)
  public chord?: boolean; // Indicates if this note is part of a chord
  public grace?: Grace; // Grace note details
  public tie?: Tie; // Ties for the note
  public notations?: Notations; // Notations (e.g., slurs, accents)
  public lyrics?: Lyric[]; // Lyrics associated with the note
  public accidental?: Accidental; // Accidental for the note
  public beam?: Beam; // Accidental for the note

  constructor({
    pitch,
    duration,
    type,
    dot,
    chord,
    grace,
    tie,
    notations,
    lyrics,
    accidental,
    beam,
  }: {
    pitch?: Pitch;
    duration?: number;
    type?: NoteType;
    dot?: number;
    chord?: boolean;
    grace?: Grace;
    tie?: Tie;
    notations?: Notations;
    lyrics?: Lyric[];
    accidental?: Accidental;
    beam?: Beam;
  }) {
    this.pitch = pitch;
    this.duration = duration;
    this.type = type;
    this.dot = dot;
    this.chord = chord;
    this.grace = grace;
    this.tie = tie;
    this.notations = notations;
    this.lyrics = lyrics;
    this.accidental = accidental;
    this.beam = beam;
  }

  /**
   * Serialize the `Note` object to MusicXML format.
   */
  public toXml(): string {
    const pitchXml = this.pitch
      ? `
      <pitch>
        <step>${this.pitch.step}</step>
        ${this.pitch.alter !== undefined ? `<alter>${this.pitch.alter}</alter>` : ""}
        <octave>${this.pitch.octave}</octave>
      </pitch>`
      : "";

    const typeXml = this.type ? `<type>${this.type}</type>` : "";
    const dotXml = this.dot ? `<dot>${this.dot}</dot>` : "";
    const chordXml = this.chord ? `<chord />` : "";
    const graceXml = this.grace ? this.grace.toXml() : "";
    const tieXml = this.tie ? this.tie.toXml() : "";
    const notationsXml = this.notations ? this.notations.toXml() : "";
    const accidentalXml = this.accidental
      ? `<accidental>${this.accidental}</accidental>`
      : "";
    const lyricsXml = this.lyrics?.map((lyric) => lyric.toXml()).join("") || "";
    const beamXML = this.beam?.toXml() ?? "";

    return `
    <note>
      ${chordXml}
      ${pitchXml}
      <duration>${this.duration}</duration>
      ${typeXml}
      ${dotXml}
      ${graceXml}
      ${tieXml}
      ${accidentalXml}
      ${lyricsXml}
      ${beamXML}
      ${notationsXml}
    </note>
    `;
  }
}

export enum NoteType {
  Maxima = "maxima",
  Long = "long",
  Breve = "breve",
  Whole = "whole",
  Half = "half",
  Quarter = "quarter",
  Eighth = "eighth",
  Sixteenth = "16th",
  ThirtySecond = "32nd",
  SixtyFourth = "64th",
  OneTwentyEighth = "128th",
  TwoFiftySixth = "256th",
  FiveTwelve = "512th",
  TenTwentyFour = "1024th",
}

export class Notehead {}

export class NoteheadText {
  public display_text?: FormattedText;
  public accidental_text?: AccidentalText;
}

export class Ornaments {
  public trillMark?: boolean;
  public turn?: boolean;
  public invertedTurn?: boolean;
  public mordent?: boolean;
  public invertedMordent?: boolean;
  public wavyLine?: boolean;
  public delayedTurn?: boolean;
  public delayedInvertedTurn?: boolean;
  public schleifer?: boolean;
  public otherOrnament?: string;

  constructor({
    trillMark,
    turn,
    invertedTurn,
    mordent,
    invertedMordent,
    wavyLine,
    delayedTurn,
    delayedInvertedTurn,
    schleifer,
    otherOrnament,
  }: {
    trillMark?: boolean;
    turn?: boolean;
    invertedTurn?: boolean;
    mordent?: boolean;
    invertedMordent?: boolean;
    wavyLine?: boolean;
    delayedTurn?: boolean;
    delayedInvertedTurn?: boolean;
    schleifer?: boolean;
    otherOrnament?: string;
  }) {
    this.trillMark = trillMark;
    this.turn = turn;
    this.invertedTurn = invertedTurn;
    this.mordent = mordent;
    this.invertedMordent = invertedMordent;
    this.wavyLine = wavyLine;
    this.delayedTurn = delayedTurn;
    this.delayedInvertedTurn = delayedInvertedTurn;
    this.schleifer = schleifer;
    this.otherOrnament = otherOrnament;
  }

  public toXml(): string {
    return `
    <ornaments>
      ${this.trillMark ? `<trill-mark />` : ""}
      ${this.turn ? `<turn />` : ""}
      ${this.invertedTurn ? `<inverted-turn />` : ""}
      ${this.mordent ? `<mordent />` : ""}
      ${this.invertedMordent ? `<inverted-mordent />` : ""}
      ${this.wavyLine ? `<wavy-line />` : ""}
      ${this.delayedTurn ? `<delayed-turn />` : ""}
      ${this.delayedInvertedTurn ? `<delayed-inverted-turn />` : ""}
      ${this.schleifer ? `<schleifer />` : ""}
      ${this.otherOrnament ? `<other-ornament>${this.otherOrnament}</other-ornament>` : ""}
    </ornaments>
    `;
  }
}

export class OtherNotation {}

export class OtherPlacementText {}

export class OtherText {}

export class Pitch {
  public step: string; // Note step (e.g., C, D, E)
  public alter?: number; // Alteration (e.g., -1 for flat, 1 for sharp)
  public octave: number; // Octave number

  constructor(step: string, octave: number, alter?: number) {
    this.step = step;
    this.octave = octave;
    this.alter = alter;
  }
}

export class PlacementText {}

export class Release {}

export class Rest {}

export class Slide {}

export class Slur {
  public type: "start" | "stop";

  constructor(type: "start" | "stop") {
    this.type = type;
  }

  public toXml(): string {
    return `<slur type="${this.type}" />`;
  }
}

export class Stem {}

export class StrongAccent {}

export class StyleText {}

export class Tap {}

export class Technical {
  public upBow?: boolean;
  public downBow?: boolean;
  public harmonic?: boolean;
  public openString?: boolean;
  public thumbPosition?: boolean;
  public pluck?: string; // Text for plucking instructions
  public doubleTongue?: boolean;
  public tripleTongue?: boolean;
  public stopped?: boolean;
  public snapPizzicato?: boolean;
  public heel?: boolean;
  public toe?: boolean;
  public otherTechnical?: string;

  constructor({
    upBow,
    downBow,
    harmonic,
    openString,
    thumbPosition,
    pluck,
    doubleTongue,
    tripleTongue,
    stopped,
    snapPizzicato,
    heel,
    toe,
    otherTechnical,
  }: {
    upBow?: boolean;
    downBow?: boolean;
    harmonic?: boolean;
    openString?: boolean;
    thumbPosition?: boolean;
    pluck?: string;
    doubleTongue?: boolean;
    tripleTongue?: boolean;
    stopped?: boolean;
    snapPizzicato?: boolean;
    heel?: boolean;
    toe?: boolean;
    otherTechnical?: string;
  }) {
    this.upBow = upBow;
    this.downBow = downBow;
    this.harmonic = harmonic;
    this.openString = openString;
    this.thumbPosition = thumbPosition;
    this.pluck = pluck;
    this.doubleTongue = doubleTongue;
    this.tripleTongue = tripleTongue;
    this.stopped = stopped;
    this.snapPizzicato = snapPizzicato;
    this.heel = heel;
    this.toe = toe;
    this.otherTechnical = otherTechnical;
  }

  public toXml(): string {
    return `
    <technical>
      ${this.upBow ? `<up-bow />` : ""}
      ${this.downBow ? `<down-bow />` : ""}
      ${this.harmonic ? `<harmonic />` : ""}
      ${this.openString ? `<open-string />` : ""}
      ${this.thumbPosition ? `<thumb-position />` : ""}
      ${this.pluck ? `<pluck>${this.pluck}</pluck>` : ""}
      ${this.doubleTongue ? `<double-tongue />` : ""}
      ${this.tripleTongue ? `<triple-tongue />` : ""}
      ${this.stopped ? `<stopped />` : ""}
      ${this.snapPizzicato ? `<snap-pizzicato />` : ""}
      ${this.heel ? `<heel />` : ""}
      ${this.toe ? `<toe />` : ""}
      ${this.otherTechnical ? `<other-technical>${this.otherTechnical}</other-technical>` : ""}
    </technical>
    `;
  }
}

export class TextElementData {}

export class Tie {
  public type: "start" | "stop";

  constructor(type: "start" | "stop") {
    this.type = type;
  }

  public toXml(): string {
    return `<tie type="${this.type}" />`;
  }
}

export class Tied {
  public type: "start" | "stop" | "continue"; // Required attribute
  public number?: number; // Optional attribute
  public lineType?: "solid" | "dashed" | "dotted" | "wavy"; // Optional attribute
  public dashLength?: number; // Optional attribute
  public spaceLength?: number; // Optional attribute

  constructor({
    type,
    number,
    lineType,
    dashLength,
    spaceLength,
  }: {
    type: "start" | "stop" | "continue";
    number?: number;
    lineType?: "solid" | "dashed" | "dotted" | "wavy";
    dashLength?: number;
    spaceLength?: number;
  }) {
    this.type = type;
    this.number = number;
    this.lineType = lineType;
    this.dashLength = dashLength;
    this.spaceLength = spaceLength;
  }

  public toXml(): string {
    const attributes = [
      `type="${this.type}"`,
      this.number !== undefined ? `number="${this.number}"` : "",
      this.lineType ? `line-type="${this.lineType}"` : "",
      this.dashLength !== undefined ? `dash-length="${this.dashLength}"` : "",
      this.spaceLength !== undefined
        ? `space-length="${this.spaceLength}"`
        : "",
    ]
      .filter((attr) => attr)
      .join(" ");
    return `<tied ${attributes} />`;
  }
}

export class TimeModification {
  public actual_notes?: number;
  public normal_notes?: number;
  public normal_type?: NoteTypeValue;
  public normal_dot?: Empty;
}

export class Tremolo {}

export class Tuplet {
  public tuplet_actual?: TupletPortion;
  public tuplet_normal?: TupletPortion;
}

export class TupletDot {}

export class TupletNumber {}

export class TupletPortion {
  public tuplet_number?: TupletNumber;
  public tuplet_type?: TupletType;
  public tuplet_dot?: TupletDot;
}

export class TupletType {}

export class Unpitched {}

export class Wait {}

export class Credit {
  public credit_type?: string;
  public link?: Link;
  public bookmark?: Bookmark;
  public credit_image?: Image;
  public credit_words?: FormattedTextId;
  public credit_symbol?: FormattedSymbolId;
}

export class Defaults {
  public scaling?: Scaling;
  public concert_score?: Empty;
  public appearance?: Appearance;
  public music_font?: EmptyFont;
  public word_font?: EmptyFont;
  public lyric_font?: LyricFont;
  public lyric_language?: LyricLanguage;
}

export class EmptyFont {}

export class GroupBarline {}

export class GroupName {}

export class GroupSymbol {}

export class InstrumentLink {}

export class LyricFont {}

export class LyricLanguage {}

export class Opus {}

export class PartGroup {
  public group_name?: GroupName;
  public group_name_display?: NameDisplay;
  public group_abbreviation?: GroupName;
  public group_abbreviation_display?: NameDisplay;
  public group_symbol?: GroupSymbol;
  public group_barline?: GroupBarline;
  public group_time?: Empty;
}

export class PartLink {
  public instrument_link?: InstrumentLink;
  public group_link?: string;
}

export class PartList {}

export class PartName {}

export class Player {
  public player_name?: string;
}

export class ScoreInstrument {
  public instrument_name?: string;
  public instrument_abbreviation?: string;
}

export class ScorePart {
  public identification?: Identification;
  public part_link?: PartLink;
  public part_name?: PartName;
  public part_name_display?: NameDisplay;
  public part_abbreviation?: PartName;
  public part_abbreviation_display?: NameDisplay;
  public group?: string;
  public score_instrument?: ScoreInstrument;
  public player?: Player;
  public midi_device?: MidiDevice;
  public midi_instrument?: MidiInstrument;
}

export class VirtualInstrument {
  public virtual_library?: string;
  public virtual_name?: string;
}

export class Work {
  public work_number?: string;
  public work_title?: string;
  public opus?: Opus;
}
