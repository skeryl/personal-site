import * as React from "react";
import { AudioNodeEditor } from "./AudioNodeEditor";
import { IAudioGraphNode, NodeConfig } from "../../model/nodes";
import styled from "styled-components";

const AudioNodeWrapper = styled("div")`
  width: 120px;
  padding: 8px 16px;
  display: flex;
`;

const NodeLabel = styled("div")`
  font-weight: bold;
`;

export const NodeContainer = styled("div")`
  min-height: 80px;
  border-width: 4px;
  border-color: black;
  border-style: solid;
  border-radius: 20px;
  padding: 8px;
  align-self: center;
`;

export interface FilledNodeProps {
  node: IAudioGraphNode;
  label?: string;
  onChange: (node: IAudioGraphNode) => void;
  config: NodeConfig;
}

export function FilledNode(props: FilledNodeProps) {
  const { node, config, onChange } = props;
  return (
    <AudioNodeWrapper className={config.type}>
      <NodeContainer>
        <NodeLabel>{config.name}</NodeLabel>
        <AudioNodeEditor node={node} onChange={onChange} />
      </NodeContainer>
    </AudioNodeWrapper>
  );
}
