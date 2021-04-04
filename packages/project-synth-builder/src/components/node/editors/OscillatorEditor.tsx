import React from "react";
import { EditorProps } from "./index";
import { Box, Select, InputLabel, MenuItem } from "@material-ui/core";

const options: OscillatorType[] = ["sine", "sawtooth", "square", "triangle"];

export function OscillatorEditor(props: EditorProps<OscillatorType>) {
  function onTypeChange(event: React.ChangeEvent<{ value: unknown }>) {
    props.onChange(event.target.value as OscillatorType);
  }
  return (
    <Box flexGrow={1}>
      <InputLabel id="wave-form-selector">Wave Type</InputLabel>
      <Select
        about="The wave form changes the base sound of the synth"
        fullWidth
        labelId="wave-form-selector"
        onChange={onTypeChange}
        value={props.value || "sine"}
      >
        {options.map((opt) => (
          <MenuItem key={opt} value={opt}>
            {opt}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}
