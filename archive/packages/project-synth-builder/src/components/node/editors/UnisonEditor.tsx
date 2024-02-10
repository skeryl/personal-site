import React, { ChangeEvent } from "react";
import { EditorProps } from "./index";
import { Box, InputLabel, Slider } from "@material-ui/core";

export function UnisonEditor(props: EditorProps<number>) {
  function onUnisonChange(e: ChangeEvent<{}>, value: number | number[]) {
    props.onChange(value as number);
  }
  return (
    <Box display="flex" flexDirection="column">
      <Box display="flex" flexBasis="100%">
        <InputLabel id="unison-slider">Unison</InputLabel>
      </Box>
      <Box display="flex" flexDirection="row" flexBasis="100%" p={1}>
        <Slider
          value={props.value}
          onChange={onUnisonChange}
          aria-labelledby="unison-slider"
          min={1}
          step={1}
          max={6}
          marks
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => value || 1}
        />
      </Box>
    </Box>
  );
}
