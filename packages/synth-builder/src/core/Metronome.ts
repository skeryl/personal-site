import { IAudioGraphNode } from "../model/nodes";

export class Metronome {
  private ctx: AudioContext | undefined;
  private isPlaying: boolean;
  constructor(private bpm: number, private readonly node: IAudioGraphNode) {
    this.isPlaying = false;
  }
  public get context(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  setBpm(bpm: number) {
    this.bpm = bpm;
  }

  start() {
    this.isPlaying = true;
    playNext();
  }

  playNext() {
    if (this.isPlaying) {
      const { node, outputs } = this.node.build(this.context);

      const gainNode = outputs[0] as unknown as GainNode;
      gainNode.gainNode.gain.setValueAtTime(
        gainNode.gain.value,
        this.context.currentTime,
      );
      gainNode.gain.exponentialRampToValueAtTime(
        this.maxGain,
        this.context.currentTime + 0.03,
      );
    }
  }
}
