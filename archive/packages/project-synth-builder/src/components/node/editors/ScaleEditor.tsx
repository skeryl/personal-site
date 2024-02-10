import React, { ChangeEvent } from "react";
import { Box, InputLabel, Slider, SliderProps } from "@material-ui/core";

interface ScaleEditProps {
  label: string;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  marks?: boolean;
  value?: number;
  scale?: (input: number) => number;
  valueLabelFormat?: SliderProps["valueLabelFormat"];
}

const defaultScale = (x: number) => x;

export function ScaleEditor(props: ScaleEditProps) {
  function onChange(e: ChangeEvent<{}>, value: number | number[]) {
    props.onChange(value as number);
  }

  const id = `generic-slider-${props.label}`;
  return (
    <Box display="flex" flexDirection="column">
      <Box display="flex" flexBasis="100%">
        <InputLabel id={id}>{props.label}</InputLabel>
      </Box>
      <Box display="flex" flexDirection="row" flexBasis="100%" p={1}>
        <Slider
          value={props.value}
          onChange={onChange}
          aria-labelledby={id}
          min={props.min || 0}
          max={props.max || 1}
          step={props.step || 0.05}
          marks={props.marks}
          scale={props.scale || defaultScale}
          valueLabelDisplay="auto"
          valueLabelFormat={props.valueLabelFormat}
        />
      </Box>
    </Box>
  );
}
