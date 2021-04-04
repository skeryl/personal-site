import React from "react";
import { Box } from "@material-ui/core";
import { SynthsEditor } from "./synths/SynthsEditor";

export default function SoundBooth() {
  return (
    <Box display="flex" flexDirection="row" width="100%">
      <SynthsEditor />
    </Box>
  );
}
