import { IAudioNode } from "./MutableAudioNode";
import { NodeTypes } from "../../model/nodes";
import { BuildContext } from "./BuildContext";

export interface NodeConnection {
  node: IAudioNode;
  outputIndex?: number;
  inputIndex?: number;
}

export interface GraphBuild {
  context: BuildContext;
  sources: BuildOutputV2<any>[];
}

export interface IAudioGraph {
  id: string;
  sources: IAudioNode[];
  build(context: AudioContext): GraphBuild;
  find(type: NodeTypes): IAudioNode[];
  findClosest(type: NodeTypes): IAudioNode | undefined;
  serialize(): string;
}

export interface BuildOutputV2<T extends AudioNode> {
  sourceNodeId: string;
  node: T;
}

export interface WithSource<T extends AudioNode> {
  source: IAudioNode;
  node: T;
}
