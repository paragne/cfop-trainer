import { describe, expect, it } from "vitest";
import { applyMoves, SOLVED } from "../lib/cube.ts";
import { invert, parse, stringify } from "../lib/notation.ts";
import { ALL_CASES, F2L_CASES, OLL_CASES, PLL_CASES } from "./algorithms.ts";
import type { Group } from "./algorithms.ts";

const ALGS = ALL_CASES.flatMap((c) =>
  c.algs.map((alg) => ({ id: c.id, ...alg })),
);

const MASKS_FOR: Record<Group, string[]> = {
  F2L: ["f2l"],
  OLL: ["oll-edges", "oll-full"],
  PLL: ["pll-corners", "pll-full"],
};

describe("case data", () => {
  it("has 41 F2L, 10 OLL and 6 PLL cases", () => {
    expect([F2L_CASES.length, OLL_CASES.length, PLL_CASES.length]).toEqual([
      41, 10, 6,
    ]);
  });

  it("has unique ids", () => {
    expect(new Set(ALL_CASES.map((c) => c.id)).size).toBe(ALL_CASES.length);
  });

  it.each(ALL_CASES)("$id has a mask that fits its group", (c) => {
    expect(MASKS_FOR[c.group]).toContain(c.mask.kind);
  });
});

// This only proves the parser and invert agree with the engine. Whether an
// alg actually solves its case is checked in algorithms-structure.test.ts.
describe("algs", () => {
  it.each(ALGS)("$id: the inverse then the solution is solved", ({ moves }) => {
    const alg = parse(moves);
    expect(applyMoves(applyMoves(SOLVED, invert(alg)), alg)).toEqual(SOLVED);
  });

  it.each(ALGS)("$id: display describes the same moves", ({ display, moves }) => {
    expect(parse(display)).toEqual(parse(moves));
  });

  it.each(ALGS)("$id: moves round-trip through the parser", ({ moves }) => {
    expect(stringify(parse(moves))).toBe(moves);
  });
});
