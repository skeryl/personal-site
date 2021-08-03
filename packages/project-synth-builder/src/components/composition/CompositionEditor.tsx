import React, { useEffect, useMemo, useState } from "react";
import { Box } from "@material-ui/core";
import { ControlState } from "./index";
import { CompositionControls } from "./CompositionControls";
import { Notes } from "../../model/notes";
import {
  AutomaticComposition,
  ChordType,
  CommonTimeSignatures,
  CompositionArgs,
  CompositionMetadata,
} from "../../core/composition";
import { ISynth } from "../../services/synths";
import { CompositionPlayer } from "../../core/composition/CompositionPlayer";
import { useAudioContext } from "../../hooks/useAudioContext";
import { State } from "../../redux/state";
import { connect } from "react-redux";
import { getSynths } from "../../redux/selectors/synths";
import { useSynthController } from "../../hooks/synth-controller";
import SynthNoteVisualizer from "../visualizers/SynthNoteVisualizer";
import { CompositionSettings } from "./CompositionSettings";
import { CompositionEditView } from "./CompositionEditView";

interface CompositionEditorProps {
  synths: ISynth[];
}

export function CompositionEditor({ synths }: CompositionEditorProps) {
  const [compMetadata, setCompositionMetadata] = useState<CompositionArgs>({
    bpm: 80,
    key: Notes.C,
    timeSignature: CommonTimeSignatures.CommonTime,
  });
  const [controlState, setControlState] = useState(ControlState.EDITING);
  const audioContext = useAudioContext();

  const [synth, setSynth] = useState(() => synths.find(Boolean));
  const [synth2, setSynth2] = useState(() => synths[1]);

  useEffect(() => {
    if (synths && synths.length) {
      console.log(synths);
      setSynth(synths[0]);
      setSynth2(synths[1]);
      synths[0].setGain(0.1);
      synths[1].setGain(0.035);
    }
  }, [synths]);

  function onFinished() {
    setControlState(ControlState.EDITING);
  }

  function onMetadataChange(metadata: CompositionMetadata) {
    setCompositionMetadata(metadata);
  }

  const composition: AutomaticComposition | undefined = useMemo(() => {
    if (!synth) {
      return undefined;
    }
    const composition = new AutomaticComposition(compMetadata);

    const section = composition.startSection();

    section.addChordProgression({
      instrument: synth,
      chords: [
        { note: Notes.F, type: ChordType.MAJOR, octave: 2 },
        { note: Notes.G, type: ChordType.MAJOR, octave: 2 },
        { note: Notes.A, type: ChordType.MAJOR, octave: 2 },
        { note: Notes.F, type: ChordType.MAJOR, octave: 2 },
        { note: Notes.F, type: ChordType.MAJOR, octave: 2 },
        { note: Notes.G, type: ChordType.MAJOR, octave: 2 },
        { note: Notes.A, type: ChordType.MAJOR, octave: 2 },
        { note: Notes.F, type: ChordType.MAJOR, octave: 2 },
        { note: Notes.F, type: ChordType.MAJOR, octave: 2 },
        { note: Notes.G, type: ChordType.MAJOR, octave: 2 },
        { note: Notes.A, type: ChordType.MAJOR, octave: 2 },
        { note: Notes.F, type: ChordType.MAJOR, octave: 2 },
      ],
    });

    section.addMelodicImprovisation({
      instrument: synth2,
      chords: [
        { note: Notes.C, type: ChordType.MAJOR, octave: 4 },
        { note: Notes.C, type: ChordType.MAJOR, octave: 4 },
        { note: Notes.C, type: ChordType.MAJOR, octave: 5 },
        { note: Notes.C, type: ChordType.MAJOR, octave: 4 },
        { note: Notes.C, type: ChordType.MAJOR, octave: 4 },
        { note: Notes.C, type: ChordType.MAJOR, octave: 4 },
        { note: Notes.C, type: ChordType.MAJOR, octave: 5 },
        { note: Notes.C, type: ChordType.MAJOR, octave: 4 },
        { note: Notes.C, type: ChordType.MAJOR, octave: 4 },
        { note: Notes.C, type: ChordType.MAJOR, octave: 4 },
        { note: Notes.C, type: ChordType.MAJOR, octave: 5 },
        { note: Notes.C, type: ChordType.MAJOR, octave: 4 },
      ],
    });

    return composition;
  }, [synth, compMetadata]);

  const compositionPlayer: CompositionPlayer | undefined = useMemo(
    () =>
      Boolean(audioContext.current && composition)
        ? new CompositionPlayer(audioContext.current!, composition!, onFinished)
        : undefined,
    [audioContext, composition],
  );

  async function onStateChange(
    nextState: ControlState,
    prevState: ControlState,
  ) {
    setControlState(nextState);
    if (!compositionPlayer) {
      return;
    }
    if (synth && nextState === ControlState.PLAYING) {
      await compositionPlayer.init();
      await compositionPlayer.start();
    }
    if (nextState === ControlState.EDITING) {
      await compositionPlayer.stop();
    }
  }

  const { playing } = useSynthController({
    synth,
  });

  return (
    <Box>
      <Box display="flex" flexDirection="column" flexBasis="100%" p={2}>
        <CompositionControls
          controlState={controlState}
          onStateChange={onStateChange}
        />
        <CompositionSettings
          onMetadataChange={onMetadataChange}
          metadata={composition?.metadata}
        />
      </Box>
      <Box display="flex" flexDirection="column" flexBasis="100%" p={2}>
        {composition && <CompositionEditView composition={composition} />}
      </Box>
      <SynthNoteVisualizer playing={playing} />
    </Box>
  );
}

export function mapStateToProps(state: State): CompositionEditorProps {
  return { synths: getSynths(state) };
}

export default connect(mapStateToProps, null)(CompositionEditor);
