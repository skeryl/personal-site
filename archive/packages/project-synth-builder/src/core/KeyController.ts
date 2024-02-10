import { Pitch } from "../model/notes";
import { KeyControllerProps } from "../hooks/keyboard";

export type OnUnmount = () => void;

export class KeyController {
  constructor(private readonly props: Required<KeyControllerProps>) {}

  getNote(ev: KeyboardEvent): Pitch | undefined {
    return this.props.keyMap[ev.key.toLowerCase()];
  }

  onMount(document: Document): OnUnmount {
    const onKeyDown = this.onKeyDown.bind(this);
    const onKeyUp = this.onKeyUp.bind(this);
    document.addEventListener("keypress", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keypress", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }

  onKeyDown(ev: KeyboardEvent) {
    const note = this.getNote(ev);
    if (note) {
      this.props.startPlaying(note);
    }
  }

  onKeyUp(ev: KeyboardEvent) {
    const note = this.getNote(ev);
    if (note) {
      this.props.stopPlaying(note);
    }
  }
}
