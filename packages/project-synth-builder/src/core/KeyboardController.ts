import { Pitch } from "../model/notes";

export interface KeyboardController {
  startPlaying(note: Pitch): void;
  stopPlaying(note: Pitch): void;
}
