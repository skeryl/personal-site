export enum Notes {
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

export const NoteHertzValues: Record<Notes, number> = {
  [Notes.C0]: 16.35,
  [Notes.CSharp0]: 17.32,
  [Notes.D0]: 18.35,
  [Notes.DSharp0]: 19.45,
  [Notes.E0]: 20.6,
  [Notes.F0]: 21.83,
  [Notes.FSharp0]: 23.12,
  [Notes.G0]: 24.5,
  [Notes.GSharp0]: 25.96,
  [Notes.A0]: 27.5,
  [Notes.ASharp0]: 29.14,
  [Notes.B0]: 30.87,
  [Notes.C1]: 32.7,
  [Notes.CSharp1]: 34.65,
  [Notes.D1]: 36.71,
  [Notes.DSharp1]: 38.89,
  [Notes.E1]: 41.2,
  [Notes.F1]: 43.65,
  [Notes.FSharp1]: 46.25,
  [Notes.G1]: 49,
  [Notes.GSharp1]: 51.91,
  [Notes.A1]: 55,
  [Notes.ASharp1]: 58.27,
  [Notes.B1]: 61.74,
  [Notes.C2]: 65.41,
  [Notes.CSharp2]: 69.3,
  [Notes.D2]: 73.42,
  [Notes.DSharp2]: 77.78,
  [Notes.E2]: 82.41,
  [Notes.F2]: 87.31,
  [Notes.FSharp2]: 92.5,
  [Notes.G2]: 98,
  [Notes.GSharp2]: 103.83,
  [Notes.A2]: 110,
  [Notes.ASharp2]: 116.54,
  [Notes.B2]: 123.47,
  [Notes.C3]: 130.81,
  [Notes.CSharp3]: 138.59,
  [Notes.D3]: 146.83,
  [Notes.DSharp3]: 155.56,
  [Notes.E3]: 164.81,
  [Notes.F3]: 174.61,
  [Notes.FSharp3]: 185,
  [Notes.G3]: 196,
  [Notes.GSharp3]: 207.65,
  [Notes.A3]: 220,
  [Notes.ASharp3]: 233.08,
  [Notes.B3]: 246.94,
  [Notes.C4]: 261.63,
  [Notes.CSharp4]: 277.18,
  [Notes.D4]: 293.66,
  [Notes.DSharp4]: 311.13,
  [Notes.E4]: 329.63,
  [Notes.F4]: 349.23,
  [Notes.FSharp4]: 369.99,
  [Notes.G4]: 392,
  [Notes.GSharp4]: 415.3,
  [Notes.A4]: 440,
  [Notes.ASharp4]: 466.16,
  [Notes.B4]: 493.88,
  [Notes.C5]: 523.25,
  [Notes.CSharp5]: 554.37,
  [Notes.D5]: 587.33,
  [Notes.DSharp5]: 622.25,
  [Notes.E5]: 659.25,
  [Notes.F5]: 698.46,
  [Notes.FSharp5]: 739.99,
  [Notes.G5]: 783.99,
  [Notes.GSharp5]: 830.61,
  [Notes.A5]: 880,
  [Notes.ASharp5]: 932.33,
  [Notes.B5]: 987.77,
  [Notes.C6]: 1046.5,
  [Notes.CSharp6]: 1108.73,
  [Notes.D6]: 1174.66,
  [Notes.DSharp6]: 1244.51,
  [Notes.E6]: 1318.51,
  [Notes.F6]: 1396.91,
  [Notes.FSharp6]: 1479.98,
  [Notes.G6]: 1567.98,
  [Notes.GSharp6]: 1661.22,
  [Notes.A6]: 1760,
  [Notes.ASharp6]: 1864.66,
  [Notes.B6]: 1975.53,
  [Notes.C7]: 2093,
  [Notes.CSharp7]: 2217.46,
  [Notes.D7]: 2349.32,
  [Notes.DSharp7]: 2489.02,
  [Notes.E7]: 2637.02,
  [Notes.F7]: 2793.83,
  [Notes.FSharp7]: 2959.96,
  [Notes.G7]: 3135.96,
  [Notes.GSharp7]: 3322.44,
  [Notes.A7]: 3520,
  [Notes.ASharp7]: 3729.31,
  [Notes.B7]: 3951.07,
  [Notes.C8]: 4186.01,
  [Notes.CSharp8]: 4434.92,
  [Notes.D8]: 4698.63,
  [Notes.DSharp8]: 4978.03,
  [Notes.E8]: 5274.04,
  [Notes.F8]: 5587.65,
  [Notes.FSharp8]: 5919.91,
  [Notes.G8]: 6271.93,
  [Notes.GSharp8]: 6644.88,
  [Notes.A8]: 7040,
  [Notes.ASharp8]: 7458.62,
  [Notes.B8]: 7902.13,
};

export type KeyNoteMapping = Record<string, Notes>;

export const DefaultKeyMapping: KeyNoteMapping = {
  z: Notes.C3,
  s: Notes.CSharp3,
  x: Notes.D3,
  d: Notes.DSharp3,
  c: Notes.E3,
  f: Notes.F3,
  v: Notes.F3,
  g: Notes.FSharp3,
  b: Notes.G3,
  h: Notes.GSharp3,
  n: Notes.A3,
  j: Notes.ASharp3,
  m: Notes.B3,
  ",": Notes.C4,
  q: Notes.C4,
  "2": Notes.CSharp4,
  w: Notes.D4,
  "3": Notes.DSharp4,
  e: Notes.E4,
  "4": Notes.F4,
  r: Notes.F4,
  "5": Notes.FSharp4,
  t: Notes.G4,
  "6": Notes.GSharp4,
  y: Notes.A4,
  "7": Notes.ASharp4,
  u: Notes.B4,
  i: Notes.C5,
  "9": Notes.C5,
};
