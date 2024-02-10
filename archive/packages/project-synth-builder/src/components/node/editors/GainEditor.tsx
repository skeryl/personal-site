import React, { ChangeEvent } from "react";
import { Box, InputLabel, Slider } from "@material-ui/core";
import VolumeUp from "@material-ui/icons/VolumeUp";
import VolumeDown from "@material-ui/icons/VolumeDown";
import { ISynth } from "../../../services/synths";
import { NodeTypes } from "../../../model/nodes";

interface GainEditorProps {
  synth: ISynth;
}

export function GainEditor({ synth }: GainEditorProps) {
  function onGainChange(e: ChangeEvent<{}>, value: number | number[]) {
    const gain = Math.round((value as number) * 100) / 100;
    synth.setGain(gain);
  }
  return (
    <Box display="flex" flexDirection="row" flexBasis="100%" p={1}>
      <Box flexBasis="10%" flexGrow={0}>
        <VolumeDown />
      </Box>
      <Box flexBasis="80%" flexGrow={1} pl={2} pr={2}>
        <Slider
          defaultValue={
            synth.audioGraph.findClosest(NodeTypes.Gain)!.properties
              ?.maxGain as number
          }
          onChange={onGainChange}
          aria-labelledby="continuous-slider"
          min={0}
          step={0.01}
          max={0.5}
        />
      </Box>
      <Box flexBasis="10%" flexGrow={0}>
        <VolumeUp />
      </Box>
    </Box>
  );
}
