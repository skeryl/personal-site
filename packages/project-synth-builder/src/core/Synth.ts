import { BuildOutput, IAudioGraphNode, MINIMUM_GAIN } from "../model/nodes";
import { AudioGraphNode } from "./nodes/AudioGraphNode";
import { KeyboardController } from "./KeyboardController";
import { Pitch, PitchInformation } from "../model/notes";
import { TimeSensitiveMap } from "./utils/TimeSensitiveMap";

type SynthNodes = [OscillatorNode, GainNode, AnalyserNode | undefined];

export interface SynthesizerSettings {
  attack: number; // 0 - 1
  minAttackTime: number; // minimum amount of time (in milliseconds) to delay before ramping up to play a note
  maxAttackTime: number; // maximum amount of time (in milliseconds) to delay before ramping up to play a note

  /* similar to "attack" but for the tail end of a note's sound */
  release: number;
  minReleaseTime: number;
  maxReleaseTime: number;
}

export const SYNTH_DEFAULT_SETTINGS: SynthesizerSettings = {
  attack: 1,
  minAttackTime: 0.01,
  maxAttackTime: 5,

  release: 1,
  minReleaseTime: 0.01,
  maxReleaseTime: 20,
};

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

export class Synth implements KeyboardController {
  private ctx: AudioContext | undefined;
  private readonly pitches = new Map<Pitch, SynthNodes>();
  private readonly playing = new Set<Pitch>();
  public settings: SynthesizerSettings;

  onReleaseFinished = (pitch: Pitch, audioParam: AudioParam) => {
    audioParam.cancelScheduledValues(this.context.currentTime);
  };

  private readonly attacking = new TimeSensitiveMap<Pitch, AudioParam>();
  private readonly releasing = new TimeSensitiveMap<Pitch, AudioParam>(
    this.onReleaseFinished,
  );
  private node: OscillatorNode | undefined;
  private inputs: BuildOutput<any>[] | undefined;

  constructor(
    private osc: IAudioGraphNode = AudioGraphNode.createOscillator().connectNode(
      AudioGraphNode.createGain().connectNode(
        AudioGraphNode.createDestination(),
      ),
    ),
    settings: Partial<SynthesizerSettings> = {},
  ) {
    this.settings = { ...SYNTH_DEFAULT_SETTINGS, ...settings };
  }

  public changeSettings(newSettings: Partial<SynthesizerSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  public get notesPlaying(): ReadonlySet<Pitch> {
    return new Set(this.playing);
  }

  public get oscillator(): IAudioGraphNode {
    return this.osc;
  }

  public set oscillator(osc: IAudioGraphNode) {
    const notesToRestart = Array.from(this.playing.values());
    if (this.osc && this.osc !== osc) {
      this.destroy();
    }
    this.osc = osc;
    notesToRestart.forEach((note) => {
      this.stopPlaying(note);
    });
    this.pitches.clear();
    notesToRestart.forEach((note) => this.startPlaying(note));
  }

  public getAnalyserData(): Float32Array | undefined {
    const analysers = Array.from(this.pitches.values()).reduce(
      (result, synthNodes) => {
        const [_, __, analyser] = synthNodes;
        if (analyser) {
          return [...result, analyser];
        }
        return result;
      },
      new Array<AnalyserNode>(),
    );

    if (analysers.length) {
      const result = new Float32Array(analysers[0].fftSize);
      const intermediateResult = new Float32Array(analysers[0].fftSize);

      analysers.forEach((analyser) => {
        analyser.getFloatTimeDomainData(intermediateResult);
        for (let i = 0; i < result.length; i++) {
          result[i] = result[i] + intermediateResult[i];
        }
      });
      return result;
    }
    return undefined;
  }

  private destroy() {
    this.osc.destroy();
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

  private get maxGain(): number {
    const gainGraphNode = this.osc.outputs?.[0];
    const definedMaxGain = gainGraphNode?.properties["maxGain"];
    return Math.max(
      definedMaxGain === undefined ? 1 : (definedMaxGain as number),
      MINIMUM_GAIN,
    );
  }

  buildNode(context: AudioContext, frequency?: number): SynthNodes {
    const osc = frequency
      ? this.oscillator.withProperty("frequency", frequency)
      : this.oscillator;

    const { node, outputs, inputs } = osc.build<OscillatorNode>(context);
    if (node.start) {
      node.start(0);
    } else {
      if (inputs.length) {
        inputs.forEach((inp) => {
          if (inp.node.start) {
            inp.node.start(0);
          }
        });
      }
      this.node = node;
      this.inputs = inputs;
    }

    // oscillators are only allowed one output, in this case we need it to always be the gain node
    const gainBuild = outputs[0];
    const gainNode = gainBuild.node as GainNode;

    const gainOutput = gainBuild.outputs[0];
    const analyser =
      gainOutput.node instanceof AnalyserNode ? gainOutput.node : undefined;

    gainNode.gain.value = MINIMUM_GAIN;
    return [node, gainNode, analyser];
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
      const [oscillator, gainNode, analyser] = this.buildNode(
        this.context,
        PitchInformation[pitch].hertz,
      );
      this.pitches.set(pitch, [oscillator, gainNode, analyser]);
    }
    if (this.playing.has(pitch)) {
      return;
    }
    const [, gainNode] = this.pitches.get(pitch) as SynthNodes;
    gainNode.gain.setValueAtTime(gainNode.gain.value, this.context.currentTime);
    const attackTime = getAttackTime(this.settings);
    const rampUp = gainNode.gain.exponentialRampToValueAtTime(
      this.maxGain,
      this.context.currentTime + attackTime,
    );
    this.attacking.set(pitch, rampUp, attackTime * 1000);
    this.playing.add(pitch);
  }

  stopPlaying(pitch: Pitch) {
    if (this.attacking.has(pitch)) {
      this.attacking.delete(pitch);
    }
    if (this.playing.has(pitch) && this.pitches.has(pitch)) {
      const [, gainNode] = this.pitches.get(pitch) as SynthNodes;
      gainNode.gain.setValueAtTime(
        gainNode.gain.value,
        this.context.currentTime,
      );
      const releaseTime = getReleaseTime(this.settings);
      const rampDown = gainNode.gain.exponentialRampToValueAtTime(
        MINIMUM_GAIN,
        this.context.currentTime + releaseTime,
      );
      this.releasing.set(pitch, rampDown, releaseTime * 1000);
      this.playing.delete(pitch);
    }
  }
}
