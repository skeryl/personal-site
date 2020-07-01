import * as React from "react";
import { DropTargetMonitor } from "react-dnd";
import { IAudioGraphNode, NodeConfigs, NodeTypes } from "../model/nodes";
import { AudioNodeSink } from "./AudioNodeSink";
import { AudioNodeEditor } from "./AudioNodeEditor";
import styled from "styled-components";

interface Props {
  label?: string;
  node: IAudioGraphNode;
  context: AudioContext;
  onNodeChange: (node: IAudioGraphNode) => void;
}

const AudioNodeWrapper = styled("div")`
  width: 100px;
  height: 100px;
  border-width: 4px;
  border-color: black;
  border-style: solid;
  position: relative;
  margin-right: 24px;
  :not(.empty):after {
    content: "→";
    display: block;
    position: absolute;
    left: 108px;
  }
`;

const Label = styled("div")`
  font-weight: bold;
`;

const ActiveNodeContainer = styled("div")``;

export function AudioNodeComponent(props: Props) {
  const { node } = props;

  function onDrop(item: any, monitor: DropTargetMonitor) {
    props.onNodeChange(
      props.node.connect(NodeConfigs[item.nodeType as NodeTypes]),
    );
  }

  function onOutputChanged(
    outputIndex: number,
    newOutputNode: IAudioGraphNode,
  ) {
    props.onNodeChange(props.node.connectNode(newOutputNode));
    console.log(`output ${outputIndex} changed.`, newOutputNode);
  }

  return (
    <>
      <AudioNodeWrapper
        className={props.node.config ? props.node.config.type : "empty"}
      >
        <Label>{props.label}</Label>
        {node.config ? (
          <ActiveNodeContainer>
            <AudioNodeEditor context={props.context} node={node} />
          </ActiveNodeContainer>
        ) : (
          <AudioNodeSink
            label={props.label}
            functions={props.node.functions}
            onDrop={onDrop}
          />
        )}
      </AudioNodeWrapper>
      {props.node.outputs.map((output, ix) => (
        <AudioNodeComponent
          key={ix}
          label={`${node.config?.name} output #${ix}`}
          context={props.context}
          onNodeChange={(newOutputNode) => onOutputChanged(ix, newOutputNode)}
          node={output}
        />
      ))}
    </>
  );
}
