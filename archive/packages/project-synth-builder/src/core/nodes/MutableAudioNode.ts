import {
  ImmutableNodeProperties,
  NodeConfigs,
  NodeProperties,
  NodeTypes,
  PropertyValue,
} from "../../model/nodes";
import { v4 as uuid } from "uuid";
import { BuildContext } from "./BuildContext";
import { BuildOutputV2, NodeConnection } from "./index";

export interface IAudioNode {
  id: string;
  type: NodeTypes;
  properties: NodeProperties;
  connections: NodeConnection[];

  build<T extends AudioNode>(context: BuildContext): BuildOutputV2<T>;

  setProperty(propertyName: string, value: PropertyValue): ThisType<IAudioNode>;

  connect(
    node: IAudioNode,
    outputIndex?: number,
    inputIndex?: number,
  ): ThisType<IAudioNode>;

  find(type: NodeTypes): IAudioNode[];

  findClosest(type: NodeTypes): IAudioNode | undefined;
}

export class MutableAudioNode implements IAudioNode {
  constructor(
    public type: NodeTypes,
    public properties: NodeProperties,
    public connections: NodeConnection[],
    public id: string = uuid(),
  ) {
    this.connections = connections.map((connection) => ({
      ...connection,
      node: new MutableAudioNode(
        connection.node.type,
        connection.node.properties,
        connection.node.connections,
        connection.node.id,
      ),
    }));
  }

  setProperty(propertyName: string, value: PropertyValue): this {
    this.properties[propertyName] = value;
    return this;
  }

  connect(node: IAudioNode, outputIndex?: number, inputIndex?: number): this {
    this.connections.push({ node, outputIndex, inputIndex });
    return this;
  }

  build<T extends AudioNode>(context: BuildContext): BuildOutputV2<T> {
    const nodeConfig = NodeConfigs[this.type];
    if (!nodeConfig || !nodeConfig.factory) {
      throw new Error(
        `Unable to build a node that doesn't have a config or factory!`,
      );
    }

    const node = nodeConfig.factory(context.audioContext) as T;
    if (nodeConfig.propertySetter) {
      nodeConfig.propertySetter(node, this.properties);
    }

    context.setBuild(this, node);

    this.connections.map((connection) => {
      const connectedBuild = context.getBuild(connection.node);
      node.connect(
        connectedBuild.node,
        connection.outputIndex,
        connection.inputIndex,
      );
    });

    return { node, sourceNodeId: this.id };
  }

  find(type: NodeTypes): IAudioNode[] {
    const belowNodes: IAudioNode[] = this.connections.reduce(
      (result, conn) => [...result, ...conn.node.find(type)],
      [] as IAudioNode[],
    );
    return this.type === type ? [this, ...belowNodes] : belowNodes;
  }

  findClosest(type: NodeTypes): IAudioNode | undefined {
    if (this.type === type) {
      return this;
    }
    return this.connections.reduce<IAudioNode | undefined>(
      (result, conn) => result || conn.node.findClosest(type),
      undefined,
    );
  }

  static create(
    type: NodeTypes,
    properties: ImmutableNodeProperties = {},
    connections: NodeConnection[] = [],
  ) {
    return new MutableAudioNode(type, properties, connections);
  }

  static createOscillator() {
    return new MutableAudioNode(NodeTypes.Oscillator, {}, []);
  }

  static createGain() {
    return new MutableAudioNode(NodeTypes.Gain, {}, []);
  }

  static createDestination() {
    return new MutableAudioNode(NodeTypes.AudioDestination, {}, []);
  }
}
