import { IAudioGraphNode, MINIMUM_GAIN } from "../model/nodes";
import { AudioGraphNode } from "./nodes/AudioGraphNode";
import { KeyboardController } from "./KeyboardController";
import { Pitch, PitchInformation } from "../model/notes";

type SynthNodes = [OscillatorNode, GainNode];

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
  minAttackTime: 0.03,
  maxAttackTime: 5,

  release: 1,
  minReleaseTime: 0.05,
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
    this.osc = osc;
    const notesToRestart = Array.from(this.playing.values());
    notesToRestart.forEach((note) => {
      this.stopPlaying(note);
    });
    this.pitches.clear();
    notesToRestart.forEach((note) => this.startPlaying(note));
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
    }

    // oscillators are only allowed one output, in this case we need it to always be the gain node
    const gainNode = outputs[0].node as GainNode;

    gainNode.gain.value = MINIMUM_GAIN;
    return [node, gainNode];
  }

  public get context(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  startPlaying(pitch: Pitch) {
    if (!this.pitches.has(pitch)) {
      const [oscillator, gainNode] = this.buildNode(
        this.context,
        PitchInformation[pitch].hertz,
      );
      this.pitches.set(pitch, [oscillator, gainNode]);
    }
    if (this.playing.has(pitch)) {
      return;
    }
    const [, gainNode] = this.pitches.get(pitch) as SynthNodes;
    gainNode.gain.setValueAtTime(gainNode.gain.value, this.context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      this.maxGain,
      this.context.currentTime + getAttackTime(this.settings),
    );
    this.playing.add(pitch);
  }

  stopPlaying(note: Pitch) {
    if (this.playing.has(note) && this.pitches.has(note)) {
      const [, gainNode] = this.pitches.get(note) as SynthNodes;
      gainNode.gain.setValueAtTime(
        gainNode.gain.value,
        this.context.currentTime,
      );
      gainNode.gain.exponentialRampToValueAtTime(
        MINIMUM_GAIN,
        this.context.currentTime + getReleaseTime(this.settings),
      );
      this.playing.delete(note);
    }
  }
}
