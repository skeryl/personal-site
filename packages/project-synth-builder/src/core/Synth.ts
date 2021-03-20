import { IAudioGraphNode, MINIMUM_GAIN, NodeTypes } from "../model/nodes";
import { AudioGraphNode } from "./nodes/AudioGraphNode";
import { KeyboardController } from "./KeyboardController";
import { Pitch, PitchInformation } from "../model/notes";

type SynthNodes = [OscillatorNode, GainNode];

export class Synth implements KeyboardController {
  private ctx: AudioContext | undefined;
  private readonly pitches = new Map<Pitch, SynthNodes>();
  private readonly playing = new Set<Pitch>();

  constructor(
    private osc: IAudioGraphNode = AudioGraphNode.createOscillator().connectNode(
      AudioGraphNode.createGain().connectNode(
        AudioGraphNode.createDestination(),
      ),
    ),
  ) {}

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
      this.context.currentTime + 0.03,
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
        this.context.currentTime + 0.05,
      );
      this.playing.delete(note);
    }
  }
}
