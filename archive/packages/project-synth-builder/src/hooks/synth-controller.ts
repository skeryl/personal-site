import { useCallback, useState } from "react";
import { Pitch } from "../model/notes";
import { ISynth } from "../services/synths";
import { useKeyboardController } from "./keyboard";

export function useSynthController({ synth }: { synth: ISynth | undefined }) {
  const [playing, setPlaying] = useState(synth?.notesPlaying);

  const startPlaying = useCallback(
    (note: Pitch) => {
      if (!synth) {
        return;
      }
      synth.startPlaying(note);
      setPlaying(synth.notesPlaying);
    },
    [synth],
  );

  const stopPlaying = useCallback(
    (note: Pitch) => {
      if (!synth) {
        return;
      }
      synth.stopPlaying(note);
      setPlaying(synth.notesPlaying);
    },
    [synth],
  );

  useKeyboardController(
    {
      startPlaying,
      stopPlaying,
    },
    [synth],
  );

  return {
    playing: playing || new Set(),
  };
}
