import { ISynth } from "../services/synths";
import { KeyNoteMapping, Pitch } from "../model/notes";
import { KeyController, OnUnmount } from "./KeyController";

export class SynthController {
  private readonly keyController = new KeyController({
    keyMap: this.keyMap,
    stopPlaying: this.stopPlaying.bind(this),
    startPlaying: this.startPlaying.bind(this),
  });

  constructor(
    private readonly synth: ISynth,
    private readonly keyMap: KeyNoteMapping,
  ) {}

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
