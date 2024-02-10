import { BuildOutput, MINIMUM_GAIN, NodeTypes } from "../model/nodes";
import { Pitch, PitchInformation } from "../model/notes";
import { TimeSensitiveMap } from "./utils/TimeSensitiveMap";
import { IAudioGraph, WithSource } from "./nodes";
import { IAudioNode, MutableAudioNode } from "./nodes/MutableAudioNode";
import { MutableAudioGraph } from "./nodes/MutableAudioGraph";
import { ISynth, SynthMetadata } from "../services/synths";
import { startingGraph } from "../components/synths/SynthComponent";

export interface SynthesizerSettings {
  attack: number; // 0 - 1
  minAttackTime: number; // minimum amount of time (in milliseconds) to delay before ramping up to play a note
  maxAttackTime: number; // maximum amount of time (in milliseconds) to delay before ramping up to play a note

  /* similar to "attack" but for the tail end of a note's sound */
  release: number;
  minReleaseTime: number;
  maxReleaseTime: number;

  unison: number;
  unisonDetune: number;

  waveType: OscillatorType;
}

export const SYNTH_DEFAULT_SETTINGS: SynthesizerSettings = {
  attack: 1,
  minAttackTime: 0.01,
  maxAttackTime: 5,

  release: 1,
  minReleaseTime: 0.01,
  maxReleaseTime: 20,

  unison: 1,
  unisonDetune: 0.25,

  waveType: "sine",
};

interface SynthNodes {
  oscillators: WithSource<OscillatorNode>[];
  gains: WithSource<GainNode>[];
  analysers: WithSource<AnalyserNode>[];
  pitch: Pitch;
}

/**
 * Uses the "attack" setting to generate a literal time delay during which the sound should "ramp up" to the {maxGain}
 * */
export function getAttackTime(
  settings: Pick<
    SynthesizerSettings,
    "attack" | "maxAttackTime" | "minAttackTime"
  >,
): number {
  const attackSafe = Math.max(0, Math.min(1, settings.attack));
  return (1 - attackSafe) * settings.maxAttackTime + settings.minAttackTime;
}

/**
 * Uses the "release" setting to generate a literal time delay during which the sound should "ramp down" to nothing
 * */
export function getReleaseTime(
  settings: Pick<
    SynthesizerSettings,
    "release" | "maxReleaseTime" | "minReleaseTime"
  >,
): number {
  const releaseSafe = Math.max(0, Math.min(1, settings.release));
  return (1 - releaseSafe) * settings.maxReleaseTime + settings.minReleaseTime;
}

type GraphTransform = (
  settings: SynthesizerSettings,
  audioGraph: IAudioGraph,
) => IAudioGraph;

type TransformSettings = keyof Pick<SynthesizerSettings, "unison">;

const GraphTransformations: Record<TransformSettings, GraphTransform> = {
  unison: (settings, audioGraph) => {
    const { unison, unisonDetune } = settings;

    if (unison <= 1) {
      return audioGraph;
    }

    // prior to "unison" there should only be one oscillator
    const oscillator = audioGraph.findClosest(NodeTypes.Oscillator)!;

    const mergeNode = MutableAudioNode.create(NodeTypes.ChannelMerger, {
      numberOfInputs: settings.unison,
    });

    const newOscillators = new Array(unison).fill(undefined).map((_, ix) => {
      const osc = MutableAudioNode.create(NodeTypes.Oscillator, {
        ...oscillator.properties,
        detune: Math.random() * unisonDetune * 200,
      });
      osc.connect(mergeNode, 0, ix % 2);
      return osc;
    });

    mergeNode.connect(oscillator.connections[0].node);

    return MutableAudioGraph.create(...newOscillators);
  },
};

const EMPTY_METADATA: SynthMetadata = {
  id: "",
  lastUpdated: new Date(),
  name: "",
};

export interface PitchAnalyserNode {
  pitch: Pitch;
  analyser: AnalyserNode;
}

type AnalyserDataFunction = keyof Pick<
  AnalyserNode,
  "getFloatTimeDomainData" | "getFloatFrequencyData"
>;

export class Synth implements ISynth {
  private ctx: AudioContext | undefined;
  private readonly pitches = new Map<Pitch, SynthNodes>();
  private readonly playing = new Set<Pitch>();
  public settings: SynthesizerSettings;

  onReleaseFinished = (pitch: Pitch, audioParams: AudioParam[]) => {
    audioParams.forEach((audioParam) =>
      audioParam.cancelScheduledValues(this.context.currentTime),
    );
  };

  private readonly attacking = new TimeSensitiveMap<Pitch, AudioParam[]>();
  private readonly releasing = new TimeSensitiveMap<Pitch, AudioParam[]>(
    this.onReleaseFinished,
  );
  private node: OscillatorNode | undefined;
  private inputs: BuildOutput<any>[] | undefined;

  constructor(
    public audioGraph: IAudioGraph,
    settings: Partial<SynthesizerSettings> = {},
    public metadata = EMPTY_METADATA,
  ) {
    this.settings = { ...SYNTH_DEFAULT_SETTINGS, ...settings };
  }

  public get id(): string {
    return this.metadata.id;
  }

  public changeSettings(
    newSettings: Partial<SynthesizerSettings>,
  ): SynthesizerSettings {
    const oldSettings = this.settings;
    this.settings = { ...oldSettings, ...newSettings };

    if (oldSettings.waveType !== this.settings.waveType) {
      this.oscillators.forEach((osc) => {
        osc.setProperty("type", this.settings.waveType);
      });
    }

    this.pitches.clear();
    return this.settings;
  }

  public get notesPlaying(): ReadonlySet<Pitch> {
    return new Set(this.playing);
  }

  public get oscillators(): IAudioNode[] {
    return this.audioGraph.sources.filter(
      (source) => source.type === NodeTypes.Oscillator,
    );
  }

  public setGain(gain: number): void {
    const gainNode = this.audioGraph.findClosest(NodeTypes.Gain)!;
    gainNode.setProperty("maxGain", gain);
    this.pitches.clear();
  }

  public get gainNodes(): IAudioNode[] {
    return this.audioGraph.find(NodeTypes.Gain);
  }

  private getAnalysers(): PitchAnalyserNode[] {
    return Array.from(this.pitches.values()).reduce((result, synthNodes) => {
      return [
        ...result,
        ...synthNodes.analysers.map((an) => ({
          pitch: synthNodes.pitch,
          analyser: an.node,
        })),
      ];
    }, new Array<PitchAnalyserNode>());
  }

  private getAnalyserData(
    dataFunction: AnalyserDataFunction,
  ): Float32Array | undefined {
    const analysers = this.getAnalysers().map((v) => v.analyser);
    if (analysers.length) {
      const result = new Float32Array(analysers[0].fftSize);
      const intermediateResult = new Float32Array(analysers[0].fftSize);
      analysers.forEach((analyser) => {
        analyser[dataFunction](intermediateResult);
        for (let i = 0; i < result.length; i++) {
          result[i] = result[i] + intermediateResult[i];
        }
      });
      if (dataFunction === "getFloatFrequencyData" && analysers.length > 1) {
        for (let i = 0; i < result.length; i++) {
          result[i] = result[i] / analysers.length;
        }
      }
      return result;
    }
    return undefined;
  }

  private getAnalyserDataByPitch(
    dataFunction: AnalyserDataFunction,
    data: Map<Pitch, Float32Array>,
  ): Map<Pitch, Float32Array> {
    this.getAnalysers().forEach((an) => {
      if (!data.has(an.pitch)) {
        data.set(an.pitch, new Float32Array(an.analyser.fftSize));
      }
      an.analyser[dataFunction](data.get(an.pitch) as Float32Array);
    });
    return data;
  }

  public getTimeDomainData(): Float32Array | undefined {
    return this.getAnalyserData("getFloatTimeDomainData");
  }

  public getFrequencyData(): Float32Array | undefined {
    return this.getAnalyserData("getFloatFrequencyData");
  }

  public getTimeDomainDataByPitch(
    buffer?: Map<Pitch, Float32Array>,
  ): Map<Pitch, Float32Array> {
    return this.getAnalyserDataByPitch(
      "getFloatTimeDomainData",
      buffer ?? new Map<Pitch, Float32Array>(),
    );
  }

  public getFrequencyDataByPitch(
    buffer?: Map<Pitch, Float32Array>,
  ): Map<Pitch, Float32Array> {
    return this.getAnalyserDataByPitch(
      "getFloatFrequencyData",
      buffer ?? new Map<Pitch, Float32Array>(),
    );
  }

  private destroy() {
    // this.osc.destroy();
    if (this.node?.stop) {
      this.node.stop(0);
    }
    this.inputs?.forEach((inp) => {
      if (inp.node.stop) {
        inp.node.stop(0);
      }
    });
    Array.from(this.playing.values()).forEach((playing) =>
      this.stopPlaying(playing),
    );
    this.releasing.clear();
  }

  private getMaxGain(gainNode: IAudioNode): number {
    const definedMaxGain = gainNode.properties["maxGain"];
    return Math.max(
      definedMaxGain === undefined ? 1 : (definedMaxGain as number),
      MINIMUM_GAIN,
    );
  }

  buildNode(
    context: AudioContext,
    pitch: Pitch,
    frequency?: number,
  ): SynthNodes {
    if (frequency) {
      this.oscillators.forEach((osc) => {
        osc.setProperty("frequency", frequency);
      });
    }

    const graph: IAudioGraph = this.transformGraph();

    const { context: buildContext } = graph.build(context);

    buildContext.oscillatorNodes().forEach((nodeBuild) => {
      nodeBuild.node.start(0);
    });

    buildContext.gainNodes().forEach((nodeBuild) => {
      nodeBuild.node.gain.value = MINIMUM_GAIN;
    });

    return {
      analysers: buildContext.analyserNodes(),
      gains: buildContext.gainNodes(),
      oscillators: buildContext.oscillatorNodes(),
      pitch,
    };
  }

  public get context(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  startPlaying(pitch: Pitch) {
    if (this.releasing.has(pitch)) {
      this.releasing.delete(pitch);
    }
    if (!this.pitches.has(pitch)) {
      const { oscillators, gains, analysers } = this.buildNode(
        this.context,
        pitch,
        PitchInformation[pitch].hertz,
      );
      this.pitches.set(pitch, { oscillators, gains, analysers, pitch });
    }
    if (this.playing.has(pitch)) {
      return;
    }
    const { gains } = this.pitches.get(pitch) as SynthNodes;
    const attackTime = getAttackTime(this.settings);
    const rampUp = gains.map((gainNode) => {
      gainNode.node.gain.setValueAtTime(
        gainNode.node.gain.value,
        this.context.currentTime,
      );
      return gainNode.node.gain.exponentialRampToValueAtTime(
        this.getMaxGain(gainNode.source),
        this.context.currentTime + attackTime,
      );
    });
    this.attacking.set(pitch, rampUp, attackTime * 1000);
    this.playing.add(pitch);
  }

  stopPlaying(pitch: Pitch) {
    if (this.attacking.has(pitch)) {
      this.attacking.delete(pitch);
    }
    if (this.playing.has(pitch) && this.pitches.has(pitch)) {
      const { gains } = this.pitches.get(pitch) as SynthNodes;
      const releaseTime = getReleaseTime(this.settings);
      const rampDown = gains.map((gainBuild) => {
        const gainNode = gainBuild.node;
        gainNode.gain.setValueAtTime(
          gainNode.gain.value,
          this.context.currentTime,
        );
        return gainNode.gain.exponentialRampToValueAtTime(
          MINIMUM_GAIN,
          this.context.currentTime + releaseTime,
        );
      });
      this.releasing.set(pitch, rampDown, releaseTime * 1000);
      this.playing.delete(pitch);
    }
  }

  private transformGraph() {
    const transformKeys = Object.keys(
      GraphTransformations,
    ) as Array<TransformSettings>;
    return transformKeys.reduce<IAudioGraph>(
      (result, transform: TransformSettings) => {
        return GraphTransformations[transform](this.settings, result);
      },
      this.audioGraph,
    );
  }

  static createBasic(): Synth {
    return new Synth(
      startingGraph(),
      { attack: 0.99, release: 0.93 },
      { name: "Basic Synth", lastUpdated: new Date(), id: "" },
    );
  }
}
