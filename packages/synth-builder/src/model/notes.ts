export enum Pitch {
  C0 = "C0",
  CSharp0 = "CSharp0",
  D0 = "D0",
  DSharp0 = "DSharp0",
  E0 = "E0",
  F0 = "F0",
  FSharp0 = "FSharp0",
  G0 = "G0",
  GSharp0 = "GSharp0",
  A0 = "A0",
  ASharp0 = "ASharp0",
  B0 = "B0",
  C1 = "C1",
  CSharp1 = "CSharp1",
  D1 = "D1",
  DSharp1 = "DSharp1",
  E1 = "E1",
  F1 = "F1",
  FSharp1 = "FSharp1",
  G1 = "G1",
  GSharp1 = "GSharp1",
  A1 = "A1",
  ASharp1 = "ASharp1",
  B1 = "B1",
  C2 = "C2",
  CSharp2 = "CSharp2",
  D2 = "D2",
  DSharp2 = "DSharp2",
  E2 = "E2",
  F2 = "F2",
  FSharp2 = "FSharp2",
  G2 = "G2",
  GSharp2 = "GSharp2",
  A2 = "A2",
  ASharp2 = "ASharp2",
  B2 = "B2",
  C3 = "C3",
  CSharp3 = "CSharp3",
  D3 = "D3",
  DSharp3 = "DSharp3",
  E3 = "E3",
  F3 = "F3",
  FSharp3 = "FSharp3",
  G3 = "G3",
  GSharp3 = "GSharp3",
  A3 = "A3",
  ASharp3 = "ASharp3",
  B3 = "B3",
  C4 = "C4",
  CSharp4 = "CSharp4",
  D4 = "D4",
  DSharp4 = "DSharp4",
  E4 = "E4",
  F4 = "F4",
  FSharp4 = "FSharp4",
  G4 = "G4",
  GSharp4 = "GSharp4",
  A4 = "A4",
  ASharp4 = "ASharp4",
  B4 = "B4",
  C5 = "C5",
  CSharp5 = "CSharp5",
  D5 = "D5",
  DSharp5 = "DSharp5",
  E5 = "E5",
  F5 = "F5",
  FSharp5 = "FSharp5",
  G5 = "G5",
  GSharp5 = "GSharp5",
  A5 = "A5",
  ASharp5 = "ASharp5",
  B5 = "B5",
  C6 = "C6",
  CSharp6 = "CSharp6",
  D6 = "D6",
  DSharp6 = "DSharp6",
  E6 = "E6",
  F6 = "F6",
  FSharp6 = "FSharp6",
  G6 = "G6",
  GSharp6 = "GSharp6",
  A6 = "A6",
  ASharp6 = "ASharp6",
  B6 = "B6",
  C7 = "C7",
  CSharp7 = "CSharp7",
  D7 = "D7",
  DSharp7 = "DSharp7",
  E7 = "E7",
  F7 = "F7",
  FSharp7 = "FSharp7",
  G7 = "G7",
  GSharp7 = "GSharp7",
  A7 = "A7",
  ASharp7 = "ASharp7",
  B7 = "B7",
  C8 = "C8",
  CSharp8 = "CSharp8",
  D8 = "D8",
  DSharp8 = "DSharp8",
  E8 = "E8",
  F8 = "F8",
  FSharp8 = "FSharp8",
  G8 = "G8",
  GSharp8 = "GSharp8",
  A8 = "A8",
  ASharp8 = "ASharp8",
  B8 = "B8",
}

export enum Notes {
  C = "C",
  CSharp = "CSharp",
  D = "D",
  DSharp = "DSharp",
  E = "E",
  F = "F",
  FSharp = "FSharp",
  G = "G",
  GSharp = "GSharp",
  A = "A",
  ASharp = "ASharp",
  B = "B",
}

export interface PitchInfo {
  hertz: number;
  note: Notes;
  nameShort: string;
  nameLong: string;
}

export const PitchInformation: Record<Pitch, PitchInfo> = {
  [Pitch.C0]: { note: Notes.C, hertz: 16.35, nameShort: "C", nameLong: "C 0" },
  [Pitch.CSharp0]: {
    note: Notes.CSharp,
    hertz: 17.32,
    nameShort: "C#",
    nameLong: "C# 0",
  },
  [Pitch.D0]: { note: Notes.D, hertz: 18.35, nameShort: "D", nameLong: "D 0" },
  [Pitch.DSharp0]: {
    note: Notes.DSharp,
    hertz: 19.45,
    nameShort: "D#",
    nameLong: "D# 0",
  },
  [Pitch.E0]: { note: Notes.E, hertz: 20.6, nameShort: "E", nameLong: "E 0" },
  [Pitch.F0]: { note: Notes.F, hertz: 21.83, nameShort: "F", nameLong: "F 0" },
  [Pitch.FSharp0]: {
    note: Notes.FSharp,
    hertz: 23.12,
    nameShort: "F#",
    nameLong: "F# 0",
  },
  [Pitch.G0]: { note: Notes.G, hertz: 24.5, nameShort: "G", nameLong: "G 0" },
  [Pitch.GSharp0]: {
    note: Notes.GSharp,
    hertz: 25.96,
    nameShort: "G#",
    nameLong: "G# 0",
  },
  [Pitch.A0]: { note: Notes.A, hertz: 27.5, nameShort: "A", nameLong: "A 0" },
  [Pitch.ASharp0]: {
    note: Notes.ASharp,
    hertz: 29.14,
    nameShort: "A#",
    nameLong: "A# 0",
  },
  [Pitch.B0]: { note: Notes.B, hertz: 30.87, nameShort: "B", nameLong: "B 0" },
  [Pitch.C1]: { note: Notes.C, hertz: 32.7, nameShort: "C", nameLong: "C 1" },
  [Pitch.CSharp1]: {
    note: Notes.CSharp,
    hertz: 34.65,
    nameShort: "C#",
    nameLong: "C# 1",
  },
  [Pitch.D1]: { note: Notes.D, hertz: 36.71, nameShort: "D", nameLong: "D 1" },
  [Pitch.DSharp1]: {
    note: Notes.DSharp,
    hertz: 38.89,
    nameShort: "D#",
    nameLong: "D# 1",
  },
  [Pitch.E1]: { note: Notes.E, hertz: 41.2, nameShort: "E", nameLong: "E 1" },
  [Pitch.F1]: { note: Notes.F, hertz: 43.65, nameShort: "F", nameLong: "F 1" },
  [Pitch.FSharp1]: {
    note: Notes.FSharp,
    hertz: 46.25,
    nameShort: "F#",
    nameLong: "F# 1",
  },
  [Pitch.G1]: { note: Notes.G, hertz: 49, nameShort: "G", nameLong: "G 1" },
  [Pitch.GSharp1]: {
    note: Notes.GSharp,
    hertz: 51.91,
    nameShort: "G#",
    nameLong: "G# 1",
  },
  [Pitch.A1]: { note: Notes.A, hertz: 55, nameShort: "A", nameLong: "A 1" },
  [Pitch.ASharp1]: {
    note: Notes.ASharp,
    hertz: 58.27,
    nameShort: "A#",
    nameLong: "A# 1",
  },
  [Pitch.B1]: { note: Notes.B, hertz: 61.74, nameShort: "B", nameLong: "B 1" },
  [Pitch.C2]: { note: Notes.C, hertz: 65.41, nameShort: "C", nameLong: "C 2" },
  [Pitch.CSharp2]: {
    note: Notes.CSharp,
    hertz: 69.3,
    nameShort: "C#",
    nameLong: "C# 2",
  },
  [Pitch.D2]: { note: Notes.D, hertz: 73.42, nameShort: "D", nameLong: "D 2" },
  [Pitch.DSharp2]: {
    note: Notes.DSharp,
    hertz: 77.78,
    nameShort: "D#",
    nameLong: "D# 2",
  },
  [Pitch.E2]: { note: Notes.E, hertz: 82.41, nameShort: "E", nameLong: "E 2" },
  [Pitch.F2]: { note: Notes.F, hertz: 87.31, nameShort: "F", nameLong: "F 2" },
  [Pitch.FSharp2]: {
    note: Notes.FSharp,
    hertz: 92.5,
    nameShort: "F#",
    nameLong: "F# 2",
  },
  [Pitch.G2]: { note: Notes.G, hertz: 98, nameShort: "G", nameLong: "G 2" },
  [Pitch.GSharp2]: {
    note: Notes.GSharp,
    hertz: 103.83,
    nameShort: "G#",
    nameLong: "G# 2",
  },
  [Pitch.A2]: { note: Notes.A, hertz: 110, nameShort: "A", nameLong: "A 2" },
  [Pitch.ASharp2]: {
    note: Notes.ASharp,
    hertz: 116.54,
    nameShort: "A#",
    nameLong: "A# 2",
  },
  [Pitch.B2]: { note: Notes.B, hertz: 123.47, nameShort: "B", nameLong: "B 2" },
  [Pitch.C3]: { note: Notes.C, hertz: 130.81, nameShort: "C", nameLong: "C 3" },
  [Pitch.CSharp3]: {
    note: Notes.CSharp,
    hertz: 138.59,
    nameShort: "C#",
    nameLong: "C# 3",
  },
  [Pitch.D3]: { note: Notes.D, hertz: 146.83, nameShort: "D", nameLong: "D 3" },
  [Pitch.DSharp3]: {
    note: Notes.DSharp,
    hertz: 155.56,
    nameShort: "D#",
    nameLong: "D# 3",
  },
  [Pitch.E3]: { note: Notes.E, hertz: 164.81, nameShort: "E", nameLong: "E 3" },
  [Pitch.F3]: { note: Notes.F, hertz: 174.61, nameShort: "F", nameLong: "F 3" },
  [Pitch.FSharp3]: {
    note: Notes.FSharp,
    hertz: 185,
    nameShort: "F#",
    nameLong: "F# 3",
  },
  [Pitch.G3]: { note: Notes.G, hertz: 196, nameShort: "G", nameLong: "G 3" },
  [Pitch.GSharp3]: {
    note: Notes.GSharp,
    hertz: 207.65,
    nameShort: "G#",
    nameLong: "G# 3",
  },
  [Pitch.A3]: { note: Notes.A, hertz: 220, nameShort: "A", nameLong: "A 3" },
  [Pitch.ASharp3]: {
    note: Notes.ASharp,
    hertz: 233.08,
    nameShort: "A#",
    nameLong: "A# 3",
  },
  [Pitch.B3]: { note: Notes.B, hertz: 246.94, nameShort: "B", nameLong: "B 3" },
  [Pitch.C4]: { note: Notes.C, hertz: 261.63, nameShort: "C", nameLong: "C 4" },
  [Pitch.CSharp4]: {
    note: Notes.CSharp,
    hertz: 277.18,
    nameShort: "C#",
    nameLong: "C# 4",
  },
  [Pitch.D4]: { note: Notes.D, hertz: 293.66, nameShort: "D", nameLong: "D 4" },
  [Pitch.DSharp4]: {
    note: Notes.DSharp,
    hertz: 311.13,
    nameShort: "D#",
    nameLong: "D# 4",
  },
  [Pitch.E4]: { note: Notes.E, hertz: 329.63, nameShort: "E", nameLong: "E 4" },
  [Pitch.F4]: { note: Notes.F, hertz: 349.23, nameShort: "F", nameLong: "F 4" },
  [Pitch.FSharp4]: {
    note: Notes.FSharp,
    hertz: 369.99,
    nameShort: "F#",
    nameLong: "F# 4",
  },
  [Pitch.G4]: { note: Notes.G, hertz: 392, nameShort: "G", nameLong: "G 4" },
  [Pitch.GSharp4]: {
    note: Notes.GSharp,
    hertz: 415.3,
    nameShort: "G#",
    nameLong: "G# 4",
  },
  [Pitch.A4]: { note: Notes.A, hertz: 440, nameShort: "A", nameLong: "A 4" },
  [Pitch.ASharp4]: {
    note: Notes.ASharp,
    hertz: 466.16,
    nameShort: "A#",
    nameLong: "A# 4",
  },
  [Pitch.B4]: { note: Notes.B, hertz: 493.88, nameShort: "B", nameLong: "B 4" },
  [Pitch.C5]: { note: Notes.C, hertz: 523.25, nameShort: "C", nameLong: "C 5" },
  [Pitch.CSharp5]: {
    note: Notes.CSharp,
    hertz: 554.37,
    nameShort: "C#",
    nameLong: "C# 5",
  },
  [Pitch.D5]: { note: Notes.D, hertz: 587.33, nameShort: "D", nameLong: "D 5" },
  [Pitch.DSharp5]: {
    note: Notes.DSharp,
    hertz: 622.25,
    nameShort: "D#",
    nameLong: "D# 5",
  },
  [Pitch.E5]: { note: Notes.E, hertz: 659.25, nameShort: "E", nameLong: "E 5" },
  [Pitch.F5]: { note: Notes.F, hertz: 698.46, nameShort: "F", nameLong: "F 5" },
  [Pitch.FSharp5]: {
    note: Notes.FSharp,
    hertz: 739.99,
    nameShort: "F#",
    nameLong: "F# 5",
  },
  [Pitch.G5]: { note: Notes.G, hertz: 783.99, nameShort: "G", nameLong: "G 5" },
  [Pitch.GSharp5]: {
    note: Notes.GSharp,
    hertz: 830.61,
    nameShort: "G#",
    nameLong: "G# 5",
  },
  [Pitch.A5]: { note: Notes.A, hertz: 880, nameShort: "A", nameLong: "A 5" },
  [Pitch.ASharp5]: {
    note: Notes.ASharp,
    hertz: 932.33,
    nameShort: "A#",
    nameLong: "A# 5",
  },
  [Pitch.B5]: { note: Notes.B, hertz: 987.77, nameShort: "B", nameLong: "B 5" },
  [Pitch.C6]: { note: Notes.C, hertz: 1046.5, nameShort: "C", nameLong: "C 6" },
  [Pitch.CSharp6]: {
    note: Notes.CSharp,
    hertz: 1108.73,
    nameShort: "C#",
    nameLong: "C# 6",
  },
  [Pitch.D6]: {
    note: Notes.D,
    hertz: 1174.66,
    nameShort: "D",
    nameLong: "D 6",
  },
  [Pitch.DSharp6]: {
    note: Notes.DSharp,
    hertz: 1244.51,
    nameShort: "D#",
    nameLong: "D# 6",
  },
  [Pitch.E6]: {
    note: Notes.E,
    hertz: 1318.51,
    nameShort: "E",
    nameLong: "E 6",
  },
  [Pitch.F6]: {
    note: Notes.F,
    hertz: 1396.91,
    nameShort: "F",
    nameLong: "F 6",
  },
  [Pitch.FSharp6]: {
    note: Notes.FSharp,
    hertz: 1479.98,
    nameShort: "F#",
    nameLong: "F# 6",
  },
  [Pitch.G6]: {
    note: Notes.G,
    hertz: 1567.98,
    nameShort: "G",
    nameLong: "G 6",
  },
  [Pitch.GSharp6]: {
    note: Notes.GSharp,
    hertz: 1661.22,
    nameShort: "G#",
    nameLong: "G# 6",
  },
  [Pitch.A6]: { note: Notes.A, hertz: 1760, nameShort: "A", nameLong: "A 6" },
  [Pitch.ASharp6]: {
    note: Notes.ASharp,
    hertz: 1864.66,
    nameShort: "A#",
    nameLong: "A# 6",
  },
  [Pitch.B6]: {
    note: Notes.B,
    hertz: 1975.53,
    nameShort: "B",
    nameLong: "B 6",
  },
  [Pitch.C7]: { note: Notes.C, hertz: 2093, nameShort: "C", nameLong: "C 7" },
  [Pitch.CSharp7]: {
    note: Notes.CSharp,
    hertz: 2217.46,
    nameShort: "C#",
    nameLong: "C# 7",
  },
  [Pitch.D7]: {
    note: Notes.D,
    hertz: 2349.32,
    nameShort: "D",
    nameLong: "D 7",
  },
  [Pitch.DSharp7]: {
    note: Notes.DSharp,
    hertz: 2489.02,
    nameShort: "D#",
    nameLong: "D# 7",
  },
  [Pitch.E7]: {
    note: Notes.E,
    hertz: 2637.02,
    nameShort: "E",
    nameLong: "E 7",
  },
  [Pitch.F7]: {
    note: Notes.F,
    hertz: 2793.83,
    nameShort: "F",
    nameLong: "F 7",
  },
  [Pitch.FSharp7]: {
    note: Notes.FSharp,
    hertz: 2959.96,
    nameShort: "F#",
    nameLong: "F# 7",
  },
  [Pitch.G7]: {
    note: Notes.G,
    hertz: 3135.96,
    nameShort: "G",
    nameLong: "G 7",
  },
  [Pitch.GSharp7]: {
    note: Notes.GSharp,
    hertz: 3322.44,
    nameShort: "G#",
    nameLong: "G# 7",
  },
  [Pitch.A7]: { note: Notes.A, hertz: 3520, nameShort: "A", nameLong: "A 7" },
  [Pitch.ASharp7]: {
    note: Notes.ASharp,
    hertz: 3729.31,
    nameShort: "A#",
    nameLong: "A# 7",
  },
  [Pitch.B7]: {
    note: Notes.B,
    hertz: 3951.07,
    nameShort: "B",
    nameLong: "B 7",
  },
  [Pitch.C8]: {
    note: Notes.C,
    hertz: 4186.01,
    nameShort: "C",
    nameLong: "C 8",
  },
  [Pitch.CSharp8]: {
    note: Notes.CSharp,
    hertz: 4434.92,
    nameShort: "C#",
    nameLong: "C# 8",
  },
  [Pitch.D8]: {
    note: Notes.D,
    hertz: 4698.63,
    nameShort: "D",
    nameLong: "D 8",
  },
  [Pitch.DSharp8]: {
    note: Notes.DSharp,
    hertz: 4978.03,
    nameShort: "D#",
    nameLong: "D# 8",
  },
  [Pitch.E8]: {
    note: Notes.E,
    hertz: 5274.04,
    nameShort: "E",
    nameLong: "E 8",
  },
  [Pitch.F8]: {
    note: Notes.F,
    hertz: 5587.65,
    nameShort: "F",
    nameLong: "F 8",
  },
  [Pitch.FSharp8]: {
    note: Notes.FSharp,
    hertz: 5919.91,
    nameShort: "F#",
    nameLong: "F# 8",
  },
  [Pitch.G8]: {
    note: Notes.G,
    hertz: 6271.93,
    nameShort: "G",
    nameLong: "G 8",
  },
  [Pitch.GSharp8]: {
    note: Notes.GSharp,
    hertz: 6644.88,
    nameShort: "G#",
    nameLong: "G# 8",
  },
  [Pitch.A8]: { note: Notes.A, hertz: 7040, nameShort: "A", nameLong: "A 8" },
  [Pitch.ASharp8]: {
    note: Notes.ASharp,
    hertz: 7458.62,
    nameShort: "A#",
    nameLong: "A# 8",
  },
  [Pitch.B8]: {
    note: Notes.B,
    hertz: 7902.13,
    nameShort: "B",
    nameLong: "B 8",
  },
};

export type KeyNoteMapping = Record<string, Pitch>;

export const DefaultKeyMapping: KeyNoteMapping = {
  a: Pitch.B2,
  z: Pitch.C3,
  s: Pitch.CSharp3,
  x: Pitch.D3,
  d: Pitch.DSharp3,
  c: Pitch.E3,
  f: Pitch.F3,
  v: Pitch.F3,
  g: Pitch.FSharp3,
  b: Pitch.G3,
  h: Pitch.GSharp3,
  n: Pitch.A3,
  j: Pitch.ASharp3,
  m: Pitch.B3,
  k: Pitch.C4,
  ",": Pitch.C4,
  l: Pitch.CSharp4,
  ".": Pitch.D4,
  ";": Pitch.DSharp4,
  "/": Pitch.E4,
  "'": Pitch.CSharp5,
  "1": Pitch.B3,
  q: Pitch.C4,
  "2": Pitch.CSharp4,
  w: Pitch.D4,
  "3": Pitch.DSharp4,
  e: Pitch.E4,
  "4": Pitch.F4,
  r: Pitch.F4,
  "5": Pitch.FSharp4,
  t: Pitch.G4,
  "6": Pitch.GSharp4,
  y: Pitch.A4,
  "7": Pitch.ASharp4,
  u: Pitch.B4,
  i: Pitch.C5,
  "8": Pitch.C5,
  "9": Pitch.CSharp5,
  o: Pitch.D5,
  "0": Pitch.DSharp5,
  p: Pitch.E5,
  "-": Pitch.F5,
  "[": Pitch.F5,
  "=": Pitch.FSharp5,
  "]": Pitch.G5,
  "\\": Pitch.GSharp5,
};

export const DefaultKeyMappingLow: KeyNoteMapping = {
  a: Pitch.C0,
  z: Pitch.C0,
  s: Pitch.CSharp0,
  x: Pitch.D0,
  d: Pitch.DSharp0,
  c: Pitch.E0,
  f: Pitch.F0,
  v: Pitch.F0,
  g: Pitch.FSharp0,
  b: Pitch.G0,
  h: Pitch.GSharp0,
  n: Pitch.A0,
  j: Pitch.ASharp0,
  m: Pitch.B0,
  k: Pitch.C1,
  ",": Pitch.C1,
  l: Pitch.CSharp1,
  ".": Pitch.D1,
  ";": Pitch.DSharp1,
  "/": Pitch.C2,
  "'": Pitch.CSharp2,
  "1": Pitch.B0,
  q: Pitch.C1,
  "2": Pitch.CSharp1,
  w: Pitch.D1,
  "3": Pitch.DSharp1,
  e: Pitch.E1,
  "4": Pitch.F1,
  r: Pitch.F1,
  "5": Pitch.FSharp1,
  t: Pitch.G1,
  "6": Pitch.GSharp1,
  y: Pitch.A1,
  "7": Pitch.ASharp1,
  u: Pitch.B1,
  i: Pitch.C2,
  "8": Pitch.C2,
  "9": Pitch.CSharp2,
  o: Pitch.D2,
  "0": Pitch.DSharp2,
  p: Pitch.E2,
  "-": Pitch.F2,
  "[": Pitch.F2,
  "=": Pitch.FSharp2,
  "]": Pitch.G2,
  "\\": Pitch.GSharp2,
};
