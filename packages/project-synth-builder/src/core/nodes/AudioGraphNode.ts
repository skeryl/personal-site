import {
  BuildOutput,
  IAudioGraphNode,
  NodeConfig,
  NodeConfigs,
  NodeFunction,
  NodeTypes,
  PropertyValue,
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
  private constructor(
    public readonly functions: NodeFunction | NodeFunction[],
    public readonly config: NodeConfig,
    public readonly inputs?: ReadonlyArray<IAudioGraphNode>,
    public readonly outputs?: ReadonlyArray<IAudioGraphNode>,
    public readonly properties: Readonly<Record<string, PropertyValue>> = {
      ...config?.defaultProperties,
    },
  ) {}

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
  }*/

  build<T extends AudioNode>(context: AudioContext): BuildOutput<T> {
    const nodeConfig = this.config;
    if (!nodeConfig || !nodeConfig.factory) {
      throw new Error(
        `Unable to build a node that doesn't have a config or factory!`,
      );
    }
    const node = nodeConfig.factory(context) as T;
    if (nodeConfig.propertySetter) {
      nodeConfig.propertySetter(node, this.properties);
    }
    const outputs = (this.outputs || []).map((output) => {
      const outputNode = output.build(context);
      node.connect(outputNode.node);
      return outputNode;
    });
    return { node, outputs };
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
    return new AudioGraphNode(
      this.functions,
      this.config,
      this.inputs,
      this.outputs,
      { ...this.properties, [propertyName]: value },
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
}
