import { describe, expect, it } from "vitest";
import { axisOf, FACE_MOVES } from "./face-moves.ts";
import { scramble } from "./scramble.ts";
import { seededRandom } from "./seeded-random.fixture.ts";

const indexOf = (move: (typeof FACE_MOVES)[number]) => FACE_MOVES.indexOf(move);

describe("scramble", () => {
  const scrambles = Array.from({ length: 500 }, (_, seed) => scramble(seededRandom(seed)));

  it("is 20 to 25 moves, and reaches both ends", () => {
    const lengths = new Set(scrambles.map((s) => s.length));
    expect(Math.min(...lengths)).toBe(20);
    expect(Math.max(...lengths)).toBe(25);
  });

  it("never turns one axis twice in a row", () => {
    for (const moves of scrambles) {
      moves.forEach((move, i) => {
        if (i > 0) expect(axisOf(indexOf(move))).not.toBe(axisOf(indexOf(moves[i - 1])));
      });
    }
  });

  it("uses only face moves and reaches all 18", () => {
    expect(new Set(scrambles.flat().map(indexOf))).toEqual(new Set(FACE_MOVES.map((_, i) => i)));
  });

  it("is deterministic for a given random source", () => {
    expect(scramble(seededRandom(7))).toEqual(scramble(seededRandom(7)));
  });
});
