import { describe, expect, it } from "vitest";
import { applyMoves, PIECES, SOLVED } from "./cube.ts";
import { parse } from "./notation.ts";
import type { MoveName } from "./notation.ts";

const NAMES: MoveName[] = [
  "U", "D", "L", "R", "F", "B",
  "u", "d", "l", "r", "f", "b",
  "M", "E", "S",
  "x", "y", "z",
];

const IDENTITY = Array.from({ length: 54 }, (_, i) => i);

const pieceOf: number[] = [];
PIECES.forEach((piece, k) => {
  piece.forEach((i) => {
    pieceOf[i] = k;
  });
});

describe("PIECES", () => {
  it("has 6 centers, 12 edges and 8 corners", () => {
    expect([1, 2, 3].map((n) => PIECES.filter((p) => p.length === n).length)).toEqual([6, 12, 8]);
  });

  it("puts every sticker in exactly one piece", () => {
    expect(PIECES.flat().toSorted((a, b) => a - b)).toEqual(IDENTITY);
  });

  // A group that mixed stickers of two cubies would be torn apart by some turn.
  it.each(NAMES)("%s carries each piece onto a single piece", (name) => {
    const from = applyMoves(IDENTITY, parse(name));
    for (const piece of PIECES) {
      const landed = from.flatMap((source, to) => (piece.includes(source) ? [pieceOf[to]] : []));
      expect(new Set(landed).size).toBe(1);
    }
  });

  // The F2L mask finds a piece by its color set, so the sets must be unique.
  it("gives every piece distinct colors and a color set no other piece has", () => {
    const sets = PIECES.map((p) => p.map((i) => SOLVED[i]).toSorted().join(""));
    expect(PIECES.every((p, k) => new Set(sets[k]).size === p.length)).toBe(true);
    expect(new Set(sets).size).toBe(PIECES.length);
  });
});
