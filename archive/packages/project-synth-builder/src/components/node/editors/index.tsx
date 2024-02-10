import { IAudioGraphNode } from "../../../model/nodes";

export interface EditorProps<T> {
  value?: T;
  onChange: (val: T) => void;
}

export interface NodeEditorProps {
  node: IAudioGraphNode;
  onChange: (node: IAudioGraphNode) => void;
}
