import React, { useState } from "react";
import { Async } from "react-async";
import { Box } from "@material-ui/core";
import { Skeleton } from "@material-ui/lab";
import { useSynthService } from "../../hooks/synth-service";
import { loadSynths, serviceFn } from "../../services";
import { SynthSelector } from "../synths/SynthSelector";
import { ISynth } from "../../services/synths";

export function ChordsHelper() {
  const synthService = useSynthService();
  const [currentSynth, setCurrentSynth] = useState<ISynth | undefined>();

  function onSynthsLoaded(synths: ISynth[]) {
    if (!currentSynth && synths.length > 0) {
      setCurrentSynth(synths[0]);
    }
  }

  return (
    <Async
      promiseFn={serviceFn(loadSynths)}
      service={synthService}
      onResolve={onSynthsLoaded}
    >
      <Async.Pending>
        <Skeleton animation="wave" />
      </Async.Pending>
      <Async.Fulfilled>
        {(synths: ISynth[]) => (
          <Box>
            <SynthSelector
              synths={synths}
              onSynthSelected={setCurrentSynth}
              currentSynth={currentSynth}
            />
          </Box>
        )}
      </Async.Fulfilled>
    </Async>
  );
}
