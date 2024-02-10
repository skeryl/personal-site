import { AudioGraphNode } from "./nodes/AudioGraphNode";
import {
  BuildOutput,
  IAudioGraphNode,
  NodeFunction,
  NodeTypes,
  PropertyValue,
} from "../model/nodes";

export class MultiOscillator extends AudioGraphNode {
  private mergedNode: IAudioGraphNode;

  constructor(...inputNodes: IAudioGraphNode[]) {
    super(
      [NodeFunction.Input],
      {
        channelCountMode: "max",
        numberOfInputs: 0,
        type: NodeTypes.Oscillator,
        nodeFunction: NodeFunction.Input,
        numberOfOutputs: 1,
        name: "MultiOscillator",
        channelCount: 2,
        channelInterpretation: "speakers",
        factory: (ctx) => ctx.createChannelMerger(),
      },
      inputNodes,
    );
    this.mergedNode = AudioGraphNode.create(NodeTypes.ChannelMerger);
    inputNodes.forEach((node) => {
      node.connectNode(this.mergedNode);
    });

    this.mergedNode.connectNode(
      AudioGraphNode.createGain().connectNode(
        AudioGraphNode.createDestination(),
      ),
    );
  }

  build<T extends AudioNode>(context: AudioContext): BuildOutput<T> {
    return this.mergedNode.build(context);
  }

  connectNode(node: IAudioGraphNode): IAudioGraphNode {
    this.mergedNode = this.mergedNode.connectNode(node);
    return this;
  }

  withProperty(propertyName: string, value: PropertyValue): IAudioGraphNode {
    return this.inputs
      ? this.inputs?.reduce(
          (result, input, index) =>
            result.withInput(input.withProperty(propertyName, value), index),
          this,
        )
      : this;
  }
}
