import {
  AllNodeFunctions,
  IAudioGraphNode,
  NodeConfig,
  NodeFunction,
} from "../model/nodes";

export class AudioGraphNode implements IAudioGraphNode {
  private readonly outputNodes: Array<IAudioGraphNode>;

  constructor(
    public readonly functions: NodeFunction | NodeFunction[],
    private cfg?: NodeConfig,
    public readonly inputs?: ReadonlyArray<IAudioGraphNode>,
    outputs?: IAudioGraphNode[],
  ) {
    this.outputNodes =
      outputs || (cfg ? [new AudioGraphNode(AllNodeFunctions)] : []);
  }

  withInput(node: IAudioGraphNode): IAudioGraphNode {
    return new AudioGraphNode(
      this.functions,
      this.config,
      [...(this.inputs || []), node],
      [...this.outputs],
    );
  }

  connectNode(config: IAudioGraphNode): IAudioGraphNode {
    const outputs = [...this.outputs];
    const newNode = new AudioGraphNode(
      this.functions,
      this.config,
      this.inputs,
      outputs,
    );
    const output = config.withInput(newNode);
    outputs.splice(0, 0, output);
    return newNode;
  }

  connect(config: NodeConfig): IAudioGraphNode {
    return this.connectNode(new AudioGraphNode(this.functions, config));
  }

  /*setOutput(outputNode: IAudioGraphNode, outputIndex: number): IAudioGraphNode {
    const audioNode = this.audioNode;
    const existingOutput = this.outputs[outputIndex];
    if (audioNode) {
      if (existingOutput && existingOutput.node) {
        existingOutput.node.disconnect();
      }
      if (outputNode.node) {
        audioNode.connect(outputNode.node);
      }
    }
    return new AudioGraphNode(
      this.functions,
      this.inputs,
      audioNode,
      this.config,
    );
  }*/

  public get config(): NodeConfig | undefined {
    return this.cfg;
  }

  public get outputs(): ReadonlyArray<IAudioGraphNode> {
    return this.outputNodes;
  }

  build(context: AudioContext): AudioNode {
    const nodeConfig = this.config;
    if (!nodeConfig || !nodeConfig.factory) {
      throw new Error(
        `Unable to build a node that doesn't have a config or factory!`,
      );
    }
    const node = nodeConfig.factory(context);
    this.outputs.forEach((output) => {
      const outputNode = output.build(context);
      node.connect(outputNode);
    });
    return node;
  }

  /*public get node(): AudioNode | undefined {
    return this.audioNode;
  }*/
}
