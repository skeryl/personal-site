import React, { ChangeEvent } from "react";
import { Box, InputLabel, Slider } from "@material-ui/core";

interface ScaleEditProps {
  label: string;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  marks?: boolean;
  value?: number;
  scale?: (input: number) => number;
}

const defaultScale = (x: number) => Math.pow(x, 8);

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
          defaultValue={props.value}
          onChange={onChange}
          aria-labelledby={id}
          min={props.min || 0}
          max={props.max || 1}
          step={props.step || 0.05}
          marks={props.marks}
          scale={props.scale || defaultScale}
        />
      </Box>
    </Box>
  );
}
