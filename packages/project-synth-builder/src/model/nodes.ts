export enum NodeTypes {
  Analyser = "Analyser",
  AudioDestination = "AudioDestination",
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

export type NodeProperties = Record<string, PropertyValue>;
export type ImmutableNodeProperties = Readonly<NodeProperties>;

export interface PropertySetter<T extends AudioNode> {
  (audioNode: T, properties: ImmutableNodeProperties): void;
}

export interface NodeConfig {
  name: string;
  description?: string;
  type: NodeTypes;
  factory?: NodeFactory;
  propertySetter?: PropertySetter<any>;
  nodeFunction: NodeFunction;
  defaultProperties?: ImmutableNodeProperties;
  hidden?: boolean;
  numberOfInputs: number;
  numberOfOutputs: number;
  outputOptional?: boolean;
  channelCountMode: ChannelCountMode;
  channelCount: number | undefined;
  channelInterpretation: ChannelInterpretation;
}

function setIfDefined<Target, Key extends keyof Target>(
  key: Key,
  target: Target,
  source: any,
): void {
  const value = source[key];
  if (value !== undefined) {
    target[key] = value;
  }
}

function setAudioParamIfDefined<
  Target extends Record<Key, AudioParam>,
  Key extends keyof Target,
>(key: Key, target: Target, source: any): void {
  const value = source[key];
  if (value !== undefined) {
    target[key].value = value;
  }
}

export const NodeConfigs: Record<NodeTypes, NodeConfig> = {
  [NodeTypes.Analyser]: {
    name: "Analyser",
    type: NodeTypes.Analyser,
    factory: (ctx) => ctx.createAnalyser(),
    propertySetter: (audioNode, properties) => {
      setIfDefined("minDecibels", audioNode, properties);
      setIfDefined("maxDecibels", audioNode, properties);
      setIfDefined("smoothingTimeConstant", audioNode, properties);
      setIfDefined("fftSize", audioNode, properties);
    },
    nodeFunction: NodeFunction.Analyzer,
    hidden: true,
    outputOptional: true,
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCountMode: "max",
    channelCount: 2,
    channelInterpretation: "speakers",
  },
  [NodeTypes.AudioDestination]: {
    name: "Audio Destination",
    type: NodeTypes.AudioDestination,
    nodeFunction: NodeFunction.Output,
    factory: (ctx) => ctx.destination,
    outputOptional: true,
    numberOfInputs: 1,
    numberOfOutputs: 0,
    channelCountMode: "explicit",
    channelCount: 2,
    channelInterpretation: "speakers",
  },
  [NodeTypes.BiquadFilter]: {
    name: "Biquad Filter",
    type: NodeTypes.BiquadFilter,
    factory: (ctx) => ctx.createBiquadFilter(),
    nodeFunction: NodeFunction.Effect,
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCountMode: "max",
    channelCount: 2,
    channelInterpretation: "speakers",
  },
  [NodeTypes.ChannelMerger]: {
    name: "Channel Merger",
    type: NodeTypes.ChannelMerger,
    factory: (ctx, numberOfInputs?: number) =>
      ctx.createChannelMerger(numberOfInputs),
    nodeFunction: NodeFunction.Effect,
    numberOfInputs: Number.MAX_SAFE_INTEGER,
    numberOfOutputs: 1,
    channelCountMode: "max",
    channelCount: 2,
    channelInterpretation: "speakers",
  },
  [NodeTypes.ChannelSplitter]: {
    name: "Channel Splitter",
    type: NodeTypes.ChannelSplitter,
    factory: (ctx, numberOfOutputs?: number) =>
      ctx.createChannelSplitter(numberOfOutputs),
    nodeFunction: NodeFunction.Effect,
    numberOfInputs: 1,
    numberOfOutputs: Number.MAX_SAFE_INTEGER,
    channelCountMode: "max",
    channelCount: undefined, // same as number of outputs (which is variable, defaulting to 6)
    channelInterpretation: "discrete",
  },
  [NodeTypes.Convolver]: {
    name: "Convolver",
    type: NodeTypes.Convolver,
    factory: (ctx) => ctx.createConvolver(),
    nodeFunction: NodeFunction.Effect,
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCountMode: "clamped-max",
    channelCount: 1 | 2 | 4,
    channelInterpretation: "speakers",
  },
  [NodeTypes.Delay]: {
    name: "Delay",
    type: NodeTypes.Delay,
    factory: (ctx, maxDelayTime?: number) => ctx.createDelay(maxDelayTime),
    nodeFunction: NodeFunction.Effect,
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCountMode: "max",
    channelCount: 2,
    channelInterpretation: "speakers",
  },
  [NodeTypes.DynamicsCompressor]: {
    name: "Dynamics Compressor",
    type: NodeTypes.DynamicsCompressor,
    factory: (ctx) => ctx.createDynamicsCompressor(),
    nodeFunction: NodeFunction.Effect,
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCountMode: "clamped-max",
    channelCount: 2,
    channelInterpretation: "speakers",
  },
  [NodeTypes.Gain]: {
    name: "Gain",
    type: NodeTypes.Gain,
    factory: (ctx) => ctx.createGain(),
    propertySetter: (gainNode: GainNode, properties) => {
      setAudioParamIfDefined("gain", gainNode, properties);
      if (properties.maxGain && gainNode.gain.value > properties.maxGain) {
        gainNode.gain.value = properties.maxGain as number;
      }
    },
    defaultProperties: {
      maxGain: 0.5,
    },
    nodeFunction: NodeFunction.Effect,
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCountMode: "max",
    channelCount: 2,
    channelInterpretation: "speakers",
  },
  [NodeTypes.IIRFilter]: {
    name: "IIRFilter",
    type: NodeTypes.IIRFilter,
    factory: (ctx, options) => new IIRFilterNode(ctx, options),
    nodeFunction: NodeFunction.Effect,
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCountMode: "max",
    channelCount: undefined,
    channelInterpretation: "speakers",
  },
  [NodeTypes.MediaElementAudioSource]: {
    name: "Media Element Audio Source",
    type: NodeTypes.MediaElementAudioSource,
    factory: (ctx, mediaElement: HTMLMediaElement) =>
      ctx.createMediaElementSource(mediaElement),
    nodeFunction: NodeFunction.Input,
    numberOfInputs: 0,
    numberOfOutputs: 1,
    channelCountMode: "max",
    channelCount: undefined,
    channelInterpretation: "speakers",
  },
  [NodeTypes.MediaStreamAudioDestination]: {
    name: "Media Stream Audio Destination",
    type: NodeTypes.MediaStreamAudioDestination,
    factory: (ctx) => ctx.createMediaStreamDestination(),
    nodeFunction: NodeFunction.Output,
    numberOfInputs: 1,
    numberOfOutputs: 0,
    channelCountMode: "explicit",
    channelCount: 2,
    channelInterpretation: "speakers",
  },
  [NodeTypes.MediaStreamAudioSource]: {
    name: "Media Stream Audio Source",
    type: NodeTypes.MediaStreamAudioSource,
    factory: (ctx, options: MediaStream) =>
      ctx.createMediaStreamSource(options),
    nodeFunction: NodeFunction.Input,
    numberOfInputs: 0,
    numberOfOutputs: 1,
    channelCountMode: "max",
    channelCount: undefined,
    channelInterpretation: "speakers",
  },
  [NodeTypes.MediaStreamTrackAudioSource]: {
    name: "Media Stream Track Audio Source",
    type: NodeTypes.MediaStreamTrackAudioSource,
    factory: (ctx, options: MediaStreamTrack) =>
      ctx.createMediaStreamTrackSource(options),
    nodeFunction: NodeFunction.Input,
    numberOfInputs: 0,
    numberOfOutputs: 1,
    channelCountMode: "max",
    channelCount: undefined,
    channelInterpretation: "speakers",
  },
  [NodeTypes.Oscillator]: {
    name: "Oscillator",
    type: NodeTypes.Oscillator,
    factory: (ctx) => ctx.createOscillator(),
    propertySetter: (oscillatorNode: OscillatorNode, properties) => {
      setIfDefined("type", oscillatorNode, properties);
      setAudioParamIfDefined("frequency", oscillatorNode, properties);
      setAudioParamIfDefined("detune", oscillatorNode, properties);
    },
    nodeFunction: NodeFunction.Input,
    numberOfInputs: 0,
    numberOfOutputs: 1,
    channelCountMode: "max",
    channelCount: 2,
    channelInterpretation: "speakers",
  },
  [NodeTypes.Panner]: {
    name: "Panner",
    type: NodeTypes.Panner,
    factory: (ctx) => new PannerNode(ctx),
    nodeFunction: NodeFunction.Effect,
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCountMode: "clamped-max",
    channelCount: 2,
    channelInterpretation: "speakers",
  },
  [NodeTypes.StereoPanner]: {
    name: "Stereo Panner",
    type: NodeTypes.StereoPanner,
    factory: (ctx) => ctx.createStereoPanner(),
    nodeFunction: NodeFunction.Effect,
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCountMode: "clamped-max",
    channelCount: 2,
    channelInterpretation: "speakers",
  },
  [NodeTypes.WaveShaper]: {
    name: "Wave Shaper",
    type: NodeTypes.WaveShaper,
    factory: (ctx) => new WaveShaperNode(ctx),
    nodeFunction: NodeFunction.Effect,
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCountMode: "max",
    channelCount: 2,
    channelInterpretation: "speakers",
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

export type PropertyValue = string | number;

export type BuildOutput<T extends AudioNode> = {
  node: T;
  outputs: BuildOutput<any>[];
  inputs: BuildOutput<any>[];
};

export interface SerializedNode {
  type: NodeTypes;
  properties: ImmutableNodeProperties;
  inputs: SerializedNode[];
}

export interface IAudioGraphNode {
  readonly functions: NodeFunction | NodeFunction[];
  readonly config: NodeConfig;
  readonly inputs?: ReadonlyArray<IAudioGraphNode>;
  readonly outputs?: ReadonlyArray<IAudioGraphNode>;
  readonly properties: ImmutableNodeProperties;

  connectNode(config: IAudioGraphNode): IAudioGraphNode;
  connect(config: NodeConfig | NodeTypes): IAudioGraphNode;
  insertInput(config: NodeConfig | NodeTypes): IAudioGraphNode;
  insertOutput(config: NodeConfig): IAudioGraphNode;

  build<T extends AudioNode>(context: AudioContext): BuildOutput<T>;

  withInput(config: IAudioGraphNode, inputIndex?: number): IAudioGraphNode;
  withOutput(
    outputNode: IAudioGraphNode,
    outputIndex?: number,
  ): IAudioGraphNode;
  withProperty(propertyName: string, value: PropertyValue): IAudioGraphNode;
  cloneWithoutConnections(): IAudioGraphNode;
  cloneWithoutInputs(): IAudioGraphNode;

  find(nodeType: NodeTypes): IAudioGraphNode[];
  findClosest(nodeType: NodeTypes): IAudioGraphNode | undefined;

  destroy(): void;
  toSerializableStructure(): SerializedNode;
  serialize(): string;

  setOutput(resultNode: IAudioGraphNode): ThisType<IAudioGraphNode>;
}

export const MINIMUM_GAIN = 0.00005;
