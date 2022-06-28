import React from "react";
import { Measure, Note } from "../../core/composition";
import { Box } from "@material-ui/core";

interface MeasureViewProps {
  measure: Measure;
}
export function MeasureView({ measure }: MeasureViewProps) {
  return (
    <Box border={1}>
      {measure.notes.map((note) => (note as Note)?.pitch || "")}
    </Box>
  );
}
