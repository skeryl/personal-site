import { ChordRoot, resolveNotePreference } from "./helpers"; // Adjust the path as needed
import { Key } from "./index"; // Import relevant types
import { describe, expect, it } from "vitest";
interface TestCase {
  input: ChordRoot;
  key: Key;
  expected: ChordRoot;
}
const testCases: TestCase[] = [
  // Explicit accidentals
  {
    input: { step: "E", accidental: "sharp" },
    key: new Key(0),
    expected: { step: "F" },
  },
  {
    input: { step: "B", accidental: "sharp" },
    key: new Key(0),
    expected: { step: "C" },
  },
  {
    input: { step: "B", accidental: "flat" },
    key: new Key(3),
    expected: { step: "A", accidental: "sharp" },
  },

  // Neutral keys
  {
    input: { step: "A", accidental: "sharp" },
    key: new Key(0),
    expected: { step: "B", accidental: "flat" },
  },
  {
    input: { step: "G", accidental: "flat" },
    key: new Key(0),
    expected: { step: "F", accidental: "sharp" },
  },
  {
    input: { step: "F", accidental: "flat" },
    key: new Key(0),
    expected: { step: "E" },
  },
  {
    input: { step: "B", accidental: "sharp" },
    key: new Key(0),
    expected: { step: "C" },
  },
  {
    input: { step: "C", accidental: "flat" },
    key: new Key(0),
    expected: { step: "B" },
  },

  // Positive fifths (sharp keys)
  { input: { step: "B" }, key: new Key(3), expected: { step: "B" } },
  { input: { step: "E" }, key: new Key(3), expected: { step: "E" } },

  // Negative fifths (flat keys)
  {
    input: { step: "B", accidental: "flat" },
    key: new Key(-3),
    expected: { step: "B", accidental: "flat" },
  },
  {
    input: { step: "E", accidental: "flat" },
    key: new Key(-3),
    expected: { step: "E", accidental: "flat" },
  },
];

describe("resolveNotePreference", () => {
  testCases.forEach(({ input, key, expected }, index) => {
    it(`Test Case #${index + 1}`, () => {
      expect(resolveNotePreference(input, key)).toEqual(expected);
    });
  });
});
