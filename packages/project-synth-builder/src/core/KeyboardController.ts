import { Notes } from "../model/notes";

export interface KeyboardController {
  startPlaying(note: Notes): void;
  stopPlaying(note: Notes): void;
}
