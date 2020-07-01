import React from "react";
import { IAudioGraphNode } from "../model/nodes";

interface Props {
  context: AudioContext;
  node: IAudioGraphNode;
}

export function AudioNodeEditor(props: Props) {
  return <div>{props.node.config?.name}</div>;
}
