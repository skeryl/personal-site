import * as React from "react";
import { DropTargetMonitor } from "react-dnd";
import {
  IAudioGraphNode,
  NodeConfigs,
  NodeFunction,
  NodeTypes,
} from "../../model/nodes";
import { FilledNode } from "./FilledNode";
import { AudioNodeSink } from "./AudioNodeSink";

interface Props {
  label?: string;
  node: IAudioGraphNode;
  onNodeChange: (node: IAudioGraphNode) => void;
}

export function AudioNodeComponent(props: Props) {
  const { node } = props;

  function onInputSinkDropped(item: any, monitor: DropTargetMonitor) {
    props.onNodeChange(props.node.insertInput(item.nodeType));
  }

  function onOutputSinkDropped(item: any, monitor: DropTargetMonitor) {
    props.onNodeChange(
      props.node.connect(NodeConfigs[item.nodeType as NodeTypes]),
    );
  }

  function onOutputChanged(
    outputIndex: number,
    newOutputNode: IAudioGraphNode,
  ) {
    props.onNodeChange(props.node.withOutput(newOutputNode, outputIndex));
  }

  const outputs = props.node.outputs;
  const config = node.config;
  return (
    <>
      {/*
      I need to figure out what to do with nodes that have many inputs (channel merger).
      */}
      {config.numberOfInputs > 1 && (
        <AudioNodeSink
          onDrop={onInputSinkDropped}
          functions={NodeFunction.Effect}
        />
      )}
      {config && (
        <FilledNode
          node={node}
          label={props.label}
          config={config}
          onChange={props.onNodeChange}
        />
      )}

      {config.numberOfOutputs >= 1 && (
        <AudioNodeSink
          onDrop={onOutputSinkDropped}
          functions={NodeFunction.Effect}
        />
      )}
      {outputs?.map((output, ix) => (
        <AudioNodeComponent
          key={ix}
          label={output.config?.name || `${config?.name} OUT #${ix + 1}`}
          onNodeChange={(newOutputNode) => onOutputChanged(ix, newOutputNode)}
          node={output}
        />
      ))}
    </>
  );
}
