import { startingGraph } from "../../components/synths/SynthComponent";
import { NodeTypes } from "../../model/nodes";

describe("MutableAudioNode", function () {
  describe("findClosest", function () {
    it("should find the closest node recursively", function () {
      const mutableAudioGraph = startingGraph();
      const gainNode = mutableAudioGraph.findClosest(NodeTypes.Gain);
      expect(gainNode).toBeDefined();
      expect(gainNode!.type).toEqual(NodeTypes.Gain);
    });
  });
});
