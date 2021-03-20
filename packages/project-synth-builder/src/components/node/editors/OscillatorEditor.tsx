import React from "react";
import { NodeEditorProps } from "./index";
import { Box, Select, InputLabel, MenuItem } from "@material-ui/core";

const options: OscillatorType[] = ["sine", "sawtooth", "square", "triangle"];

export function OscillatorEditor(props: NodeEditorProps) {
  function onTypeChange(event: React.ChangeEvent<{ value: unknown }>) {
    props.onChange(
      props.node.withProperty("type", event.target.value as string),
    );
  }
  return (
    <Box flexGrow={1}>
      <InputLabel id="wave-form-selector">Wave Type</InputLabel>
      <Select
        about="The wave form changes the base sound of the synth"
        fullWidth
        labelId="wave-form-selector"
        onChange={onTypeChange}
        value={(props.node.properties["type"] as string) || "sine"}
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
