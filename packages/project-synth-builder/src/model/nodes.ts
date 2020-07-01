export enum NodeTypes {
  Analyser = "Analyser",
  AudioDestination = "AudioDestination",
  AudioScheduledSource = "AudioScheduledSource",
  AudioWorklet = "AudioWorklet",
  BiquadFilter = "BiquadFilter",
  ChannelMerger = "ChannelMerger",
  ChannelSplitter = "ChannelSplitter",
  Convolver = "Convolver",
  Delay = "Delay",
  DynamicsCompressor = "DynamicsCompressor",
  Gain = "Gain",
  IIRFilter = "IIRFilter",
  MediaElementAudioSource = "MediaElementAudioSource",
  MediaStreamAudioDestination = "MediaStreamAudioDestination",
  MediaStreamAudioSource = "MediaStreamAudioSource",
  MediaStreamTrackAudioSource = "MediaStreamTrackAudioSource",
  Oscillator = "Oscillator",
  Panner = "Panner",
  ScriptProcessor = "ScriptProcessor",
  StereoPanner = "StereoPanner",
  WaveShaper = "WaveShaper",
}

export enum NodeFunction {
  Input = "Input",
  Effect = "Effect",
  Output = "Output",
  Analyzer = "Analyzer",
  Special = "Special", // ToDo: come up with better name
}

export interface NodeFactory {
  (ctx: AudioContext, ...args: any[]): AudioNode;
}

export interface NodeConfig {
  name: string;
  description?: string;
  type: NodeTypes;
  factory?: NodeFactory;
  nodeFunction: NodeFunction;
  hidden?: boolean;
}

export const NodeConfigs: Record<NodeTypes, NodeConfig> = {
  [NodeTypes.Analyser]: {
    name: "Analyser",
    type: NodeTypes.Analyser,
    factory: (ctx) => new AnalyserNode(ctx),
    nodeFunction: NodeFunction.Analyzer,
    hidden: true,
  },
  [NodeTypes.AudioDestination]: {
    name: "Audio Destination",
    type: NodeTypes.AudioDestination,
    nodeFunction: NodeFunction.Output,
    factory: (ctx) => ctx.destination,
  },
  [NodeTypes.AudioScheduledSource]: {
    name: "Audio Scheduled Source",
    type: NodeTypes.AudioScheduledSource,
    nodeFunction: NodeFunction.Input,
    hidden: true,
  },
  [NodeTypes.AudioWorklet]: {
    name: "Audio Worklet",
    type: NodeTypes.AudioWorklet,
    factory: (ctx, name, options) => new AudioWorkletNode(ctx, name, options),
    nodeFunction: NodeFunction.Special,
    hidden: true,
  },
  [NodeTypes.BiquadFilter]: {
    name: "Biquad Filter",
    type: NodeTypes.BiquadFilter,
    factory: (ctx) => new BiquadFilterNode(ctx),
    nodeFunction: NodeFunction.Effect,
  },
  [NodeTypes.ChannelMerger]: {
    name: "Channel Merger",
    type: NodeTypes.ChannelMerger,
    factory: (ctx) => new ChannelMergerNode(ctx),
    nodeFunction: NodeFunction.Effect,
  },
  [NodeTypes.ChannelSplitter]: {
    name: "Channel Splitter",
    type: NodeTypes.ChannelSplitter,
    factory: (ctx) => new ChannelSplitterNode(ctx),
    nodeFunction: NodeFunction.Effect,
  },
  [NodeTypes.Convolver]: {
    name: "Convolver",
    type: NodeTypes.Convolver,
    factory: (ctx) => new ConvolverNode(ctx),
    nodeFunction: NodeFunction.Effect,
  },
  [NodeTypes.Delay]: {
    name: "Delay",
    type: NodeTypes.Delay,
    factory: (ctx) => new DelayNode(ctx),
    nodeFunction: NodeFunction.Effect,
  },
  [NodeTypes.DynamicsCompressor]: {
    name: "Dynamics Compressor",
    type: NodeTypes.DynamicsCompressor,
    factory: (ctx) => new DynamicsCompressorNode(ctx),
    nodeFunction: NodeFunction.Effect,
  },
  [NodeTypes.Gain]: {
    name: "Gain",
    type: NodeTypes.Gain,
    factory: (ctx) => new GainNode(ctx),
    nodeFunction: NodeFunction.Effect,
  },
  [NodeTypes.IIRFilter]: {
    name: "IIRFilter",
    type: NodeTypes.IIRFilter,
    factory: (ctx, options) => new IIRFilterNode(ctx, options),
    nodeFunction: NodeFunction.Effect,
  },
  [NodeTypes.MediaElementAudioSource]: {
    name: "Media Element Audio Source",
    type: NodeTypes.MediaElementAudioSource,
    factory: (ctx, options) => new MediaElementAudioSourceNode(ctx, options),
    nodeFunction: NodeFunction.Input,
  },
  [NodeTypes.MediaStreamAudioDestination]: {
    name: "Media Stream Audio Destination",
    type: NodeTypes.MediaStreamAudioDestination,
    factory: (ctx) => new MediaStreamAudioDestinationNode(ctx),
    nodeFunction: NodeFunction.Output,
  },
  [NodeTypes.MediaStreamAudioSource]: {
    name: "Media Stream Audio Source",
    type: NodeTypes.MediaStreamAudioSource,
    factory: (ctx, options) => new MediaStreamAudioSourceNode(ctx, options),
    nodeFunction: NodeFunction.Input,
  },
  [NodeTypes.MediaStreamTrackAudioSource]: {
    name: "Media Stream Track Audio Source",
    type: NodeTypes.MediaStreamTrackAudioSource,
    factory: (ctx, options) =>
      new MediaStreamTrackAudioSourceNode(ctx, options),
    nodeFunction: NodeFunction.Input,
  },
  [NodeTypes.Oscillator]: {
    nodeFunction: NodeFunction.Input,
    name: "Oscillator",
    type: NodeTypes.Oscillator,
    factory: (ctx) => ctx.createOscillator(),
  },
  [NodeTypes.Panner]: {
    name: "Panner",
    type: NodeTypes.Panner,
    factory: (ctx) => new PannerNode(ctx),
    nodeFunction: NodeFunction.Effect,
  },
  [NodeTypes.ScriptProcessor]: {
    name: "Script Processor",
    type: NodeTypes.ScriptProcessor,
    factory: (ctx, ...args) => ctx.createScriptProcessor(...args),
    nodeFunction: NodeFunction.Special,
    hidden: true,
  },
  [NodeTypes.StereoPanner]: {
    name: "Stereo Panner",
    type: NodeTypes.StereoPanner,
    factory: (ctx) => new StereoPannerNode(ctx),
    nodeFunction: NodeFunction.Effect,
  },
  [NodeTypes.WaveShaper]: {
    name: "Wave Shaper",
    type: NodeTypes.WaveShaper,
    factory: (ctx) => new WaveShaperNode(ctx),
    nodeFunction: NodeFunction.Effect,
  },
};

export const AllNodeTypes = Object.keys(NodeConfigs).map(
  (nodeTypeStr: string) => nodeTypeStr as NodeTypes,
);

export const AllNodeFunctions = Object.keys(NodeFunction)
  .filter(Boolean)
  .map((nodeFunc) => nodeFunc as NodeFunction);

type NodesByFunc = Record<NodeFunction, NodeConfig[]>;

export const NodesByFunction: NodesByFunc = AllNodeTypes.reduce(
  (result: NodesByFunc, nodeType: NodeTypes) => {
    const nodeConfig = NodeConfigs[nodeType];
    result[nodeConfig.nodeFunction].push(nodeConfig);
    return result;
  },
  {
    [NodeFunction.Input]: [],
    [NodeFunction.Effect]: [],
    [NodeFunction.Output]: [],
    [NodeFunction.Analyzer]: [],
    [NodeFunction.Special]: [],
  },
);

export interface IAudioGraphNode {
  config?: NodeConfig;
  functions: NodeFunction | NodeFunction[];
  inputs?: ReadonlyArray<IAudioGraphNode>;
  outputs: ReadonlyArray<IAudioGraphNode>;

  connectNode(config: IAudioGraphNode): IAudioGraphNode;
  connect(config: NodeConfig): IAudioGraphNode;

  build(context: AudioContext): AudioNode;

  withInput(config: IAudioGraphNode): IAudioGraphNode;

  //setOutput(outputNode: IAudioGraphNode, outputIndex: number): IAudioGraphNode;
}
