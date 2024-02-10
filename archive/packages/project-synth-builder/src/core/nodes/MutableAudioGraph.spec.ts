import { MutableAudioGraph } from "./MutableAudioGraph";
import { NodeTypes } from "../../model/nodes";
import { MutableAudioNode } from "./MutableAudioNode";

describe("AudioGraph", function () {
  it("should be serializable", function () {
    const audioGraph = MutableAudioGraph.create(
      MutableAudioNode.create(NodeTypes.Oscillator, { type: "sine" })
        .connect(MutableAudioNode.create(NodeTypes.Gain, { maxGain: 0.4 }))
        .connect(MutableAudioNode.create(NodeTypes.AudioDestination)),
    );

    const serializedNode = audioGraph.serialize();
    console.log(serializedNode);

    const deserializedGraph = MutableAudioGraph.deserialize(serializedNode);
    expect(deserializedGraph).toEqual(audioGraph);
    expect(deserializedGraph.serialize()).toEqual(serializedNode);
  });
});
