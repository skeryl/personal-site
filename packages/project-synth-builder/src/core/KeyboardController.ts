import { NoteHertzValues, Notes } from "../model/notes";
import { IAudioGraphNode } from "../model/nodes";

export class KeyboardController {
  private readonly playing = new Map<Notes, AudioNode>();

  constructor(private readonly audioGraphNode: IAudioGraphNode) {}

  startPlaying(context: AudioContext, note: Notes) {
    if (!this.playing.has(note)) {
      const audioNode = this.audioGraphNode.config!.factory!(context);
      if (audioNode instanceof OscillatorNode) {
        audioNode.frequency.value = NoteHertzValues[note];
        audioNode.start(0);
      } else {
        console.warn(
          "KeyboardController only understands how to play OscillatorNodes right now. Whoops",
        );
      }
      this.playing.set(note, audioNode);
    }
  }

  stopPlaying(note: Notes) {
    if (this.playing.has(note)) {
      const node = this.playing.get(note) as AudioNode;
      if (node instanceof OscillatorNode) {
        node.stop();
      }
      node.disconnect();
      this.playing.delete(note);
    }
  }
}
