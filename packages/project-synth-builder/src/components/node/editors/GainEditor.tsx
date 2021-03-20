import React, { ChangeEvent } from "react";
import { NodeEditorProps } from "./index";
import { Box, InputLabel, Slider } from "@material-ui/core";
import VolumeUp from "@material-ui/icons/VolumeUp";
import VolumeDown from "@material-ui/icons/VolumeDown";

export function GainEditor(props: NodeEditorProps) {
  function onGainChange(e: ChangeEvent<{}>, value: number | number[]) {
    props.onChange(
      props.node.withProperty(
        "maxGain",
        Math.round((value as number) * 100) / 100,
      ),
    );
  }
  return (
    <Box display="flex" flexDirection="column">
      <Box display="flex" flexBasis="100%">
        <InputLabel id="volume-slider">Volume</InputLabel>
      </Box>
      <Box display="flex" flexDirection="row" flexBasis="100%" p={1}>
        <Box flexBasis="10%" flexGrow={0}>
          <VolumeDown />
        </Box>
        <Box flexBasis="80%" flexGrow={1} pl={2} pr={2}>
          <Slider
            value={props.node.properties?.maxGain as number}
            onChange={onGainChange}
            aria-labelledby="continuous-slider"
            min={0}
            step={0.01}
            scale={(x) => Math.pow(x, 8)}
            max={1}
          />
        </Box>
        <Box flexBasis="10%" flexGrow={0}>
          <VolumeUp />
        </Box>
      </Box>
    </Box>
  );
}
