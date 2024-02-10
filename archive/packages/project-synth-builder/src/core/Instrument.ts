import { Pitch } from "../model/notes";

export interface Instrument {
  startPlaying(note: Pitch): void;
  stopPlaying(note: Pitch): void;
}
