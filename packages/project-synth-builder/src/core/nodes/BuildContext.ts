import { IAudioNode } from "./MutableAudioNode";
import { BuildOutputV2, WithSource } from "./index";

/**
 * notes to self:
 * here's the big deal:
 *  - serializing nodes is hard
 *  - experiment with what a fully "mutable" graph would look like
 *  - perhaps translate to this serializable/mutable structure?
 *  - "connections" are the biggest challenge (but maybe not in this new model)
 * */

export class BuildContext {
  constructor(
    public readonly audioContext: AudioContext,
    private builtNodes: Map<string, BuildOutputV2<any>> = new Map(),
    private sourceNodes: Map<string, IAudioNode> = new Map(),
  ) {}

  public hasBuilt(node: IAudioNode) {
    return this.builtNodes.has(node.id);
  }

  public getBuild<T extends AudioNode>(node: IAudioNode): BuildOutputV2<T> {
    const existingBuild = this.builtNodes.get(node.id);
    if (existingBuild) {
      return existingBuild;
    }
    const newBuild = node.build(this);
    this.builtNodes.set(node.id, newBuild);
    this.sourceNodes.set(node.id, node);
    return newBuild as BuildOutputV2<T>;
  }

  private nodesOfType<T extends AudioNode>(
    t: Function & { prototype: T },
  ): WithSource<T>[] {
    const allNodes = Array.from(this.builtNodes.values());
    return allNodes
      .filter((out) => out.node instanceof t)
      .map((out) => ({
        node: out.node,
        source: this.sourceNodes.get(out.sourceNodeId) as IAudioNode,
      }));
  }

  public gainNodes(): WithSource<GainNode>[] {
    return this.nodesOfType(GainNode);
  }

  public oscillatorNodes(): WithSource<OscillatorNode>[] {
    return this.nodesOfType(OscillatorNode);
  }

  public analyserNodes(): WithSource<AnalyserNode>[] {
    return this.nodesOfType(AnalyserNode);
  }

  setBuild(node: IAudioNode, builtNode: AudioNode) {
    this.builtNodes.set(node.id, { sourceNodeId: node.id, node: builtNode });
    this.sourceNodes.set(node.id, node);
  }
}
