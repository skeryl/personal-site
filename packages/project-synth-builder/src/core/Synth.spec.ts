import { getAttackTime } from "./Synth";

describe("Synth", () => {
  describe("getAttackTime", function () {
    it("should return min attack time for 1", function () {
      const attackTime = getAttackTime({
        attack: 1,
        maxAttackTime: 5,
        minAttackTime: 0.03,
      });
      expect(attackTime).toEqual(0.03);
    });
    it("should return max attack time for 0", function () {
      const attackTime = getAttackTime({
        attack: 0,
        maxAttackTime: 5,
        minAttackTime: 0.03,
      });
      expect(attackTime).toEqual(5);
    });
    it("should return average of min and max attack time for 0.5", function () {
      const attackTime = getAttackTime({
        attack: 0.5,
        maxAttackTime: 5,
        minAttackTime: 0.03,
      });
      expect(attackTime).toEqual(2.53);
    });
  });
});
