import { useEffect } from "react";
import { DefaultKeyMapping, KeyNoteMapping, Pitch } from "../model/notes";

interface Props {
  startPlaying: (note: Pitch) => void;
  stopPlaying: (note: Pitch) => void;
  keyMap?: KeyNoteMapping;
  keyMapLow?: KeyNoteMapping;
}

export function useKeyboardController(props: Props, deps: any[]) {
  const keyMapping = props.keyMap || DefaultKeyMapping;

  function getNote(ev: KeyboardEvent): Pitch | undefined {
    return keyMapping[ev.key.toLowerCase()];
  }

  function onKeyDown(ev: KeyboardEvent) {
    const note = getNote(ev);
    if (note) {
      props.startPlaying(note);
    }
  }

  function onKeyUp(ev: KeyboardEvent) {
    const note = getNote(ev);
    if (note) {
      props.stopPlaying(note);
    }
  }
  useEffect(() => {
    document.addEventListener("keypress", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keypress", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, deps);
}
