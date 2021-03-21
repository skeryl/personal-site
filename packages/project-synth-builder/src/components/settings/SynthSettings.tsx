import React from "react";
import { IAudioGraphNode } from "../../model/nodes";
import Box from "@material-ui/core/Box";
import { GainEditor } from "../node/editors/GainEditor";
import { OscillatorEditor } from "../node/editors/OscillatorEditor";
import { UnisonEditor } from "../node/editors/UnisonEditor";
import { ScaleEditor } from "../node/editors/ScaleEditor";

export type NodeChangeHandler = (node: IAudioGraphNode) => void;

export interface SynthSettingsProps {
  gainNode: IAudioGraphNode;
  onGainChange: NodeChangeHandler;
  rootNode: IAudioGraphNode;
  onRootNodeChange: NodeChangeHandler;
  attack: number;
  release: number;
  onAttackChange: (val: number) => void;
  onReleaseChange: (val: number) => void;
}

export function SynthSettings(props: SynthSettingsProps) {
  const {
    gainNode,
    onGainChange,
    rootNode,
    onRootNodeChange,
    attack,
    onAttackChange,
    release,
    onReleaseChange,
  } = props;
  return (
    <Box display="flex" flexDirection="row" flexBasis="100%">
      <Box flexBasis="25%" p={2}>
        <GainEditor node={gainNode} onChange={onGainChange} />
      </Box>
      <Box flexBasis="15%" p={2}>
        <OscillatorEditor node={rootNode} onChange={onRootNodeChange} />
      </Box>
      <Box flexBasis="10%" p={2}>
        <ScaleEditor label="Attack" value={attack} onChange={onAttackChange} />
      </Box>
      <Box flexBasis="10%" p={2}>
        <ScaleEditor
          label="Release"
          value={release}
          onChange={onReleaseChange}
        />
      </Box>
      <Box flexBasis="20%" p={2}>
        <UnisonEditor node={rootNode} onChange={onRootNodeChange} />
      </Box>
    </Box>
  );
}
