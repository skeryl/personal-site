import React from "react";
import { Composition, CompositionSection } from "../../core/composition";
import { Box } from "@material-ui/core";
import { MeasureView } from "./MeasureView";

interface CompositionEditViewProps {
  composition: Composition;
}

function CompositionSectionView({ section }: { section: CompositionSection }) {
  return (
    <Box display="flex">
      {section.sequences.map((sequence) => (
        <Box display="flex" border={1}>
          {sequence.sequence.measures.map((measure) => (
            <MeasureView measure={measure} />
          ))}
        </Box>
      ))}
    </Box>
  );
}

export function CompositionEditView({ composition }: CompositionEditViewProps) {
  return (
    <Box display="flex">
      {composition.sections.map((section) => (
        <CompositionSectionView section={section} />
      ))}
    </Box>
  );
}
