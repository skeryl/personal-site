import { IAudioGraphNode } from "../../../model/nodes";

export interface NodeEditorProps {
  node: IAudioGraphNode;
  onChange: (node: IAudioGraphNode) => void;
}
