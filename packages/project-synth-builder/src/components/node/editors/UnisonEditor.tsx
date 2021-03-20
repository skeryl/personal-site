import React, { ChangeEvent } from "react";
import { NodeEditorProps } from "./index";
import { Box, InputLabel, Slider } from "@material-ui/core";

export function UnisonEditor(props: NodeEditorProps) {
  function onUnisonChange(e: ChangeEvent<{}>, value: number | number[]) {
    props.onChange(props.node.withProperty("unison", value as number));
  }
  return (
    <Box display="flex" flexDirection="column">
      <Box display="flex" flexBasis="100%">
        <InputLabel id="unison-slider">Unison</InputLabel>
      </Box>
      <Box display="flex" flexDirection="row" flexBasis="100%" p={1}>
        <Slider
          value={props.node.properties?.unison as number}
          onChange={onUnisonChange}
          aria-labelledby="unison-slider"
          min={1}
          step={1}
          max={6}
          marks
        />
      </Box>
    </Box>
  );
}
