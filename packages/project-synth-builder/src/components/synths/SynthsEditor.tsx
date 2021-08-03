import React, { useEffect, useMemo, useState } from "react";
import { Box } from "@material-ui/core";
import { Skeleton } from "@material-ui/lab";
import SynthComponent, { SynthEdits } from "./SynthComponent";
import { SynthsList } from "./SynthsList";
import { ISynth } from "../../services/synths";
import { Synth, SynthesizerSettings } from "../../core/Synth";
import { connect } from "react-redux";
import { State } from "../../redux/state";
import { getSynths } from "../../redux/selectors/synths";
import { Dispatch } from "redux";
import {
  createSynthAction,
  SynthActionTypes,
} from "../../redux/actions/synths";

interface DispatchProps {
  loadSynths: () => void;
  saveSynth: (synth: ISynth) => void;
  deleteSynth: (synth: ISynth) => void;
}

interface StateProps {
  synths: ISynth[];
}

type SynthsEditorProps = StateProps & DispatchProps;

export function SynthsEditor({
  synths,
  loadSynths,
  saveSynth,
  deleteSynth,
}: SynthsEditorProps) {
  useEffect(() => {
    loadSynths();
  }, [loadSynths]);

  const allEdits = useMemo(() => new Map<string, SynthEdits>(), []);

  const [currentSynth, setCurrentSynth] = useState<ISynth | undefined>();
  const onSynthSelected = (synth: ISynth) => setCurrentSynth(synth);

  const [edits, setEdits] = useState<SynthEdits>({});

  useEffect(() => {
    if (currentSynth) {
      const editsForSynth = allEdits.get(currentSynth.metadata.id) || {};
      setEdits(editsForSynth);
    }
  }, [currentSynth]);

  const onNewSynth = () => {
    saveSynth(Synth.createBasic());
  };

  function onNameChange(name: string) {
    if (currentSynth) {
      setEdits((prevState) => {
        const newEditState = { ...prevState, name };
        allEdits.set(currentSynth.metadata.id, newEditState);
        return newEditState;
      });
    }
  }

  function onSettingsChange(settings: SynthesizerSettings) {
    if (currentSynth) {
      setEdits((prevState) => {
        const newEditState = { ...prevState, settings };
        allEdits.set(currentSynth.metadata.id, newEditState);
        return newEditState;
      });
    }
  }

  function resetEdits(synth: ISynth) {
    allEdits.set(synth.metadata.id, {});
    setEdits({});
  }

  useEffect(() => {
    if (synths?.length) {
      const latest = synths.reduce((mostRecentSynth, currentSynth) =>
        mostRecentSynth.metadata.lastUpdated.getTime() >
        currentSynth.metadata.lastUpdated.getTime()
          ? mostRecentSynth
          : currentSynth,
      );
      setCurrentSynth(latest);
    }
  }, [synths]);

  function onSave(synth: ISynth, edits: SynthEdits) {
    if (edits.name) {
      synth.metadata.name = edits.name;
    }
    if (edits.settings) {
      synth.changeSettings(edits.settings);
    }
    saveSynth(synth);
    resetEdits(synth); // todo: handle this after save is successful.
  }

  return (
    <Box display="flex" flexDirection="row" flexBasis="100%" width="100%">
      <Box flexBasis="12.5%">
        <SynthsList
          synths={synths}
          onSynthSelected={onSynthSelected}
          activeSynth={currentSynth}
          onNewSynth={onNewSynth}
        />
      </Box>
      <Box flexGrow={1} p={2}>
        {currentSynth ? (
          <SynthComponent
            onSave={onSave}
            onDelete={deleteSynth}
            synth={currentSynth}
            edits={edits}
            onNameChange={onNameChange}
            onSettingsChange={onSettingsChange}
          />
        ) : (
          <Skeleton />
        )}
      </Box>
    </Box>
  );
}

function mapStateToProps(state: State): StateProps {
  return {
    synths: getSynths(state),
  };
}

function mapDispatchToProps(dispatch: Dispatch): DispatchProps {
  return {
    loadSynths: () => dispatch(createSynthAction(SynthActionTypes.loadSynths)),
    deleteSynth: (synth) =>
      dispatch(createSynthAction(SynthActionTypes.deleteSynth, { synth })),
    saveSynth: (synth) =>
      dispatch(createSynthAction(SynthActionTypes.saveSynth, { synth })),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(SynthsEditor);
