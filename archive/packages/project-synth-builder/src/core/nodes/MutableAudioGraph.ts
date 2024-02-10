import { NodeTypes } from "../../model/nodes";
import { v4 as uuid } from "uuid";
import { IAudioNode, MutableAudioNode } from "./MutableAudioNode";
import { BuildContext } from "./BuildContext";
import { GraphBuild, IAudioGraph } from "./index";

export class MutableAudioGraph implements IAudioGraph {
  constructor(public sources: IAudioNode[], public id: string = uuid()) {
    this.sources = sources.map((source) => {
      if (source instanceof MutableAudioNode) {
        return source;
      }
      return new MutableAudioNode(
        source.type,
        source.properties,
        source.connections,
        source.id,
      );
    });
  }

  static create(...sources: IAudioNode[]): MutableAudioGraph {
    return new MutableAudioGraph(sources);
  }

  serialize(): string {
    return JSON.stringify({ id: this.id, sources: this.sources });
  }

  static deserialize(graphString: string): MutableAudioGraph {
    const parsedGraph = JSON.parse(graphString);
    return new MutableAudioGraph(parsedGraph.sources, parsedGraph.id);
  }

  build(context: AudioContext): GraphBuild {
    const buildContext = new BuildContext(context);
    const sources = this.sources.map((source) => source.build(buildContext));
    return { context: buildContext, sources };
  }

  find(type: NodeTypes): IAudioNode[] {
    return this.sources.reduce(
      (result, source) => [...result, ...source.find(type)],
      [] as IAudioNode[],
    );
  }
  findClosest(type: NodeTypes): IAudioNode | undefined {
    return this.sources.reduce<IAudioNode | undefined>(
      (result, source) => result || source.findClosest(type),
      undefined,
    );
  }
}
