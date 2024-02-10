import React from "react";
import { Box, InputLabel, MenuItem, Select } from "@material-ui/core";
import { ISynth } from "../../services/synths";

interface Props {
  synths: ISynth[];
  currentSynth: ISynth | undefined;
  onSynthSelected: (s: ISynth) => void;
}

export function SynthSelector({
  synths,
  currentSynth,
  onSynthSelected,
}: Props) {
  function onChange(event: React.ChangeEvent<{ value: unknown }>) {
    const foundSynth = synths.find((s) => s.id === event.target.value);
    if (foundSynth) {
      onSynthSelected(foundSynth);
    } else {
      console.error(`Could not find a synth with id: "${event.target.value}"`);
    }
  }

  return (
    <Box flexGrow={1}>
      <InputLabel id="synth-selector">Synth</InputLabel>
      <Select
        fullWidth
        labelId="synth-selector"
        onChange={onChange}
        value={currentSynth?.id}
      >
        {synths.map((opt) => (
          <MenuItem key={opt.id} value={opt.id}>
            {opt.metadata.name}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}
