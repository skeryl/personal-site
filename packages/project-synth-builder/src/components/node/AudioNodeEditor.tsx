import React, { JSXElementConstructor } from "react";
import { NodeTypes } from "../../model/nodes";
import { NodeEditorProps } from "./editors";
import { GainEditor } from "./editors/GainEditor";
import { OscillatorEditor } from "./editors/OscillatorEditor";

const editors: Partial<Record<
  NodeTypes,
  JSXElementConstructor<NodeEditorProps>
>> = {
  [NodeTypes.Gain]: GainEditor,
  [NodeTypes.Oscillator]: OscillatorEditor,
};

export function AudioNodeEditor(props: NodeEditorProps) {
  const type = props.node.config?.type;
  const Editor: JSXElementConstructor<NodeEditorProps> | undefined =
    type && editors[type];
  return Editor ? <Editor onChange={props.onChange} node={props.node} /> : null;
}
