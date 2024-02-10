import { useEffect, useMemo } from "react";
import { DefaultKeyMapping, KeyNoteMapping, Pitch } from "../model/notes";
import { KeyController } from "../core/KeyController";

export interface KeyControllerProps {
  startPlaying: (note: Pitch) => void;
  stopPlaying: (note: Pitch) => void;
  keyMap?: KeyNoteMapping;
}

export function useKeyboardController(props: KeyControllerProps, deps: any[]) {
  useMemo(() => {
    const keyController = new KeyController({
      ...props,
      keyMap: props.keyMap || DefaultKeyMapping,
    });
    return keyController.onMount(document);
  }, deps);
}
