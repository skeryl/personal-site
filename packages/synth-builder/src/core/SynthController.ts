import type { ISynth } from "../services/synths";
import type { KeyNoteMapping } from "../model/notes";
import { Pitch } from "../model/notes";
import type { OnUnmount } from "./KeyController";
import { KeyController } from "./KeyController";

export class SynthController {
  private readonly keyController: KeyController;

  constructor(
    private readonly synth: ISynth,
    private readonly keyMap: KeyNoteMapping,
  ) {
    this.keyController = new KeyController({
      keyMap: this.keyMap,
      stopPlaying: this.stopPlaying.bind(this),
      startPlaying: this.startPlaying.bind(this),
    });
  }

  mount(document: Document): OnUnmount {
    return this.keyController.onMount(document);
  }

  public get notesPlaying(): ReadonlySet<Pitch> {
    return this.synth.notesPlaying;
  }

  startPlaying(pitch: Pitch) {
    this.synth.startPlaying(pitch);
  }

  stopPlaying(pitch: Pitch) {
    this.synth.stopPlaying(pitch);
  }
}
