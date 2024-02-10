import React from "react";
import { Box } from "@material-ui/core";
import { CompositionMetadata } from "../../core/composition";

interface CompositionSettingsProps {
  metadata: CompositionMetadata | undefined;
  onMetadataChange: (metadata: CompositionMetadata) => void;
}

export function CompositionSettings(props: CompositionSettingsProps) {
  return <Box display="flex"></Box>;
}
