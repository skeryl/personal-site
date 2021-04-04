import {
  BuildOutput,
  IAudioGraphNode,
  NodeConfig,
  NodeConfigs,
  NodeFunction,
  ImmutableNodeProperties,
  NodeTypes,
  PropertyValue,
  SerializedNode,
} from "../../model/nodes";

function replaceImmutably<T>(
  array: ReadonlyArray<T> | undefined,
  item: T,
  index?: number,
): ReadonlyArray<T> {
  if (!array) {
    return [item];
  }
  const newArray = [...array];
  newArray.splice(index || 0, 1, item);
  return newArray;
}

export class AudioGraphNode implements IAudioGraphNode {
  constructor(
    public readonly functions: NodeFunction | NodeFunction[],
    public readonly config: NodeConfig,
    public readonly inputs?: ReadonlyArray<IAudioGraphNode>,
    public readonly outputs?: ReadonlyArray<IAudioGraphNode>,
    public readonly properties: Readonly<Record<string, PropertyValue>> = {
      ...config?.defaultProperties,
    },
  ) {}

  destroy(): void {}

  connectNode(node: IAudioGraphNode): IAudioGraphNode {
    if (this.outputs?.find((out) => out === node)) {
      return this;
    }
    const outputs = this.outputs ? [...this.outputs] : [];
    const newNode = new AudioGraphNode(
      this.functions,
      this.config,
      this.inputs,
      outputs,
      this.properties,
    );
    const output = node.withInput(newNode);
    outputs.splice(0, 0, output);
    return newNode;
  }

  connect(config: NodeConfig | NodeTypes): IAudioGraphNode {
    if (typeof config === "string") {
      return this.connect(NodeConfigs[config as NodeTypes]);
    }
    return this.connectNode(new AudioGraphNode(this.functions, config));
  }

  find(nodeType: NodeTypes): IAudioGraphNode[] {
    if (!this.outputs) {
      return [];
    }
    const directChildren = this.outputs!.filter(
      (node) => node.config.type === nodeType,
    );
    return directChildren?.concat(
      this.outputs
        ? this.outputs.reduce(
            (res: IAudioGraphNode[], output) =>
              res.concat(output.find(nodeType)),
            [],
          )
        : [],
    );
  }

  findClosest(nodeType: NodeTypes): IAudioGraphNode | undefined {
    if (!this.outputs) {
      return undefined;
    }
    const directChildren = this.outputs!.find(
      (node) => node.config.type === nodeType,
    );
    if (directChildren) {
      return directChildren;
    }

    for (const output of this.outputs) {
      const childResult = output.findClosest(nodeType);
      if (childResult) {
        return childResult;
      }
    }
  }

  insertOutput(config: NodeConfig): IAudioGraphNode {
    if (this.config.numberOfOutputs === 0 || !this.outputs) {
      throw new Error("Unable to insert an output into this node.");
    }
    if (this.config.numberOfOutputs === 1) {
      const newOutput = AudioGraphNode.create(config);
      const currentOutput = this.outputs[0];
      if (currentOutput) {
        return this.connectNode(
          newOutput.connectNode(currentOutput.cloneWithoutInputs()),
        );
      }
      return this.connectNode(newOutput);
    }
    return this.connect(config);
  }

  /*
   * this isn't fully working yet...
   * * * * * * * * * * * * * * * * * *
   *
   */
  insertInput(config: NodeConfig | NodeTypes): IAudioGraphNode {
    if (typeof config === "string") {
      return this.insertInput(NodeConfigs[config as NodeTypes]);
    }
    if (!this.inputs) {
      throw new Error(
        "Can't insert an input in front of a node that doesn't already have inputs.",
      );
    }
    const newInputNode = new AudioGraphNode(this.functions, config);
    const newGraph = newInputNode.connectNode(this);
    const inputIndex =
      this.config.numberOfInputs === 1 ? 0 : (this.inputs.length || 1) - 1;
    const foundInput = this.inputs[inputIndex];
    if (!foundInput) {
      throw new Error("Unable to find an input to insert into!");
    }
    return foundInput.connectNode(newGraph);
  }

  private buildUnison<T extends AudioNode>(
    context: AudioContext,
  ): BuildOutput<T> {
    const { unison, ...propsToClone } = this.properties;
    const unisonAmount = unison as number;
    const inputNodes = new Array(unisonAmount).fill(undefined).map(() => {
      return new AudioGraphNode(
        this.functions,
        this.config,
        undefined,
        undefined,
        {
          ...propsToClone,
          detune: Math.random() * 50,
        },
      );
    });

    return (this.outputs || [])
      .reduce((finalNode, currentOut, ix) => {
        return finalNode.withOutput(currentOut, ix);
      }, AudioGraphNode.merge(...inputNodes))
      .build(context);
  }

  build<T extends AudioNode>(context: AudioContext): BuildOutput<T> {
    const nodeConfig = this.config;
    if (!nodeConfig || !nodeConfig.factory) {
      throw new Error(
        `Unable to build a node that doesn't have a config or factory!`,
      );
    }

    if (nodeConfig.type === NodeTypes.Oscillator) {
      if (this.properties?.unison > 1) {
        return this.buildUnison(context);
      }
    }

    const node = nodeConfig.factory(context) as T;
    if (nodeConfig.propertySetter) {
      nodeConfig.propertySetter(node, this.properties);
    }

    let inputs: BuildOutput<any>[] = [];
    if (nodeConfig.type === NodeTypes.ChannelMerger) {
      if (!this.inputs || !this.inputs.length) {
        throw new Error("ChannelMerger must have some inputs!");
      }
      inputs = this.inputs.map((inp, ix) => {
        const inputBuild = inp.build(context);
        inputBuild.node.connect(node, 0, ix);
        return inputBuild;
      });
    }

    const outputs = (this.outputs || []).map((output) => {
      const outputNode = output.build(context);
      node.connect(outputNode.node);
      return outputNode;
    });
    return { node, outputs, inputs };
  }

  withInput(inputNode: IAudioGraphNode, inputIndex?: number): IAudioGraphNode {
    return new AudioGraphNode(
      this.functions,
      this.config,
      replaceImmutably(this.inputs, inputNode, inputIndex),
      this.outputs,
      this.properties,
    );
  }

  withOutput(
    outputNode: IAudioGraphNode,
    outputIndex?: number,
  ): IAudioGraphNode {
    return new AudioGraphNode(
      this.functions,
      this.config,
      this.inputs,
      replaceImmutably(this.outputs, outputNode, outputIndex),
      this.properties,
    );
  }

  withProperty(propertyName: string, value: PropertyValue): IAudioGraphNode {
    if (this.config.type === NodeTypes.ChannelMerger) {
      return new AudioGraphNode(
        this.functions,
        this.config,
        this.inputs?.map((inp) => inp.withProperty(propertyName, value)),
        this.outputs,
        { ...this.properties, [propertyName]: value },
      );
    }
    return new AudioGraphNode(
      this.functions,
      this.config,
      this.inputs,
      this.outputs,
      { ...this.properties, [propertyName]: value },
    );
  }

  cloneWithoutConnections(): IAudioGraphNode {
    return new AudioGraphNode(
      this.functions,
      this.config,
      undefined,
      undefined,
      { ...this.properties },
    );
  }

  cloneWithoutInputs(): IAudioGraphNode {
    return new AudioGraphNode(
      this.functions,
      this.config,
      undefined,
      this.outputs,
      { ...this.properties },
    );
  }

  toSerializableStructure() {
    return {
      type: this.config.type,
      properties: this.properties,
      inputs:
        this.inputs?.map((input) => input.toSerializableStructure()) || [],
    };
  }

  serialize(): string {
    return JSON.stringify(
      this.findClosest(NodeTypes.AudioDestination)?.toSerializableStructure(),
    );
  }

  static deserialize(nodeString: string): IAudioGraphNode {
    console.log(nodeString);
    const asObject = JSON.parse(nodeString);
    return this.structureToNode(asObject);
  }

  static structureToNode(structure: SerializedNode): IAudioGraphNode {
    const nodeConfig = NodeConfigs[structure.type];
    const inputs = structure.inputs.map((inp) => this.structureToNode(inp));
    const resultNode = new AudioGraphNode(
      nodeConfig.nodeFunction,
      nodeConfig,
      inputs,
      [],
      structure.properties,
    );
    inputs.forEach((inp) => inp.setOutput(resultNode));
    return resultNode;
  }

  static merge(...nodes: IAudioGraphNode[]): IAudioGraphNode {
    return nodes.reduce(
      (result, node, ix) => result.withInput(node, ix),
      AudioGraphNode.create(NodeTypes.ChannelMerger),
    );
  }

  static createOscillator(): IAudioGraphNode {
    return new AudioGraphNode(
      NodeFunction.Input,
      NodeConfigs[NodeTypes.Oscillator],
    );
  }

  static createGain(): IAudioGraphNode {
    return new AudioGraphNode(NodeFunction.Effect, NodeConfigs[NodeTypes.Gain]);
  }

  static createDestination(): IAudioGraphNode {
    return new AudioGraphNode(
      NodeFunction.Output,
      NodeConfigs[NodeTypes.AudioDestination],
    );
  }

  static create(type: NodeTypes | NodeConfig): IAudioGraphNode {
    if (typeof type === "string") {
      const config = NodeConfigs[type];
      return AudioGraphNode.create(config);
    }
    return new AudioGraphNode(type.nodeFunction, type);
  }

  setOutput(resultNode: IAudioGraphNode): this {
    (this.outputs as Array<IAudioGraphNode>)?.splice(0, 0, resultNode);
    return this;
  }
}

const degrees = Math.PI / 180;

const Curves = {
  distortion: (k: number, samples: number) => {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; ++i) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + k) * x * 20 * degrees) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  },
};
