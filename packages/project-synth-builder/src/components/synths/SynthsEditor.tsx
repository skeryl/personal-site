import React, { useEffect, useMemo, useState } from "react";
import { Box } from "@material-ui/core";
import { Skeleton } from "@material-ui/lab";
import SynthComponent, { SynthEdits } from "./SynthComponent";
import { SynthsList } from "./SynthsList";
import { ISynth, SynthService } from "../../services/synths";
import { Synth, SynthesizerSettings } from "../../core/Synth";
import { Async, AsyncProps } from "react-async";
import { useSynthService } from "../../hooks/synth-service";

interface SynthsEditorProps {}

function loadSynths({ service }: AsyncProps<ISynth[]>) {
  return (service as SynthService).listSynths();
}

export function SynthsEditor(props: SynthsEditorProps) {
  const synthService = useSynthService();
  const [shouldRefetch, setShouldRefetch] = useState(false);

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

  const onResolve = (synths: ISynth[]) => {
    setShouldRefetch(false);
    if (!currentSynth && synths) {
      onSynthSelected(synths[0]);
    }
  };

  const onNewSynth = () => {
    synthService.saveSynth(Synth.createBasic()).then((newSynth) => {
      onSynthSelected(newSynth);
      setShouldRefetch(true);
    });
  };

  const onDelete = (s: ISynth) => {
    synthService.deleteSynth(s.metadata.id).then(() => {
      setShouldRefetch(true);
    });
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

  function onSave(synth: ISynth, edits: SynthEdits) {
    if (edits.name) {
      synth.metadata.name = edits.name;
    }
    if (edits.settings) {
      synth.changeSettings(edits.settings);
    }
    synthService.saveSynth(synth).then(() => {
      resetEdits(synth);
      setShouldRefetch(true);
    });
  }

  return (
    <Async
      promiseFn={loadSynths}
      service={synthService}
      watch={shouldRefetch}
      onResolve={onResolve}
    >
      <Async.Pending>
        <Skeleton animation="wave" />
      </Async.Pending>
      <Async.Rejected>
        {(error) => `Something went wrong: ${error.message}`}
      </Async.Rejected>
      <Async.Fulfilled>
        {(synths: ISynth[]) => (
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
                  onDelete={onDelete}
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
        )}
      </Async.Fulfilled>
    </Async>
  );
}
