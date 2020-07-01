import React, { useEffect } from "react";
import { DefaultKeyMapping, KeyNoteMapping, Notes } from "../model/notes";

interface Props {
  startPlaying: (note: Notes) => void;
  stopPlaying: (note: Notes) => void;
  keyMap?: KeyNoteMapping;
}

export function KeyboardComponent(props: Props) {
  const keyMapping = props.keyMap || DefaultKeyMapping;

  function getNote(ev: KeyboardEvent): Notes | undefined {
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
  }, []);
  return null;
}
