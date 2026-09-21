import { describe, expect, it } from "vitest";
import { applyMoves, SOLVED } from "../lib/cube.ts";
import { invert, parse, stringify } from "../lib/notation.ts";
import { ALL_CASES, CASE_SETS, F2L_CASES, OLL_CASES, PLL_CASES } from "./algorithms.ts";
import type { CaseSet, Group } from "./algorithms.ts";

const ALGS = ALL_CASES.flatMap((c) =>
  c.algs.map((alg) => ({ id: c.id, ...alg })),
);

const MASKS_FOR: Record<Group, string[]> = {
  F2L: ["f2l"],
  OLL: ["oll-edges", "oll-full"],
  PLL: ["pll-corners", "pll-full"],
};

const SETS_FOR: Record<Group, CaseSet[]> = {
  F2L: ["F2L"],
  OLL: ["2-Look OLL", "Full OLL"],
  PLL: ["2-Look PLL", "Full PLL"],
};

// Every id that existed before sets did. They key stored progress, so none may
// be renamed or dropped.
const numbered = (prefix: string, count: number) =>
  Array.from({ length: count }, (_, i) => `${prefix}-${i + 1}`);
const FROZEN_IDS = [
  ...numbered("f2l-easy", 4),
  ...numbered("f2l-disconnected", 10),
  ...numbered("f2l-corner", 6),
  ...numbered("f2l-edge", 6),
  ...numbered("f2l-connected", 10),
  ...numbered("f2l-slot", 5),
  "oll-cross-line", "oll-cross-l", "oll-cross-dot",
  ...[21, 22, 23, 24, 25, 26, 27].map((n) => `oll-${n}`),
  "pll-corners-adjacent", "pll-corners-diagonal", "pll-ua", "pll-ub", "pll-h", "pll-z",
];

const idsIn = (set: CaseSet) => ALL_CASES.filter((c) => c.sets.includes(set)).map((c) => c.id);

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

  it("keeps every pre-v2 id", () => {
    const ids = new Set(ALL_CASES.map((c) => c.id));
    expect(FROZEN_IDS.filter((id) => !ids.has(id))).toEqual([]);
  });
});

describe("set membership", () => {
  it("sizes each set", () => {
    expect(CASE_SETS.map((set) => idsIn(set).length)).toEqual([41, 10, 6, 7, 4]);
  });

  it.each(ALL_CASES)("$id lists sets once each, in canonical order, at least one", (c) => {
    expect(c.sets).not.toEqual([]);
    expect(c.sets).toEqual(CASE_SETS.filter((set) => c.sets.includes(set)));
  });

  it.each(ALL_CASES)("$id has only sets that fit its group", (c) => {
    expect(c.sets.filter((set) => !SETS_FOR[c.group].includes(set))).toEqual([]);
  });

  it("shares exactly OLL 21-27 and Ua, Ub, H, Z between a 2-look and a full set", () => {
    const shared = ALL_CASES.filter((c) => c.sets.length > 1).map((c) => c.id);
    expect(shared.toSorted()).toEqual(
      [...[21, 22, 23, 24, 25, 26, 27].map((n) => `oll-${n}`), "pll-ua", "pll-ub", "pll-h", "pll-z"].toSorted(),
    );
  });

  it.each([
    ["oll-cross-line", ["2-Look OLL"]],
    ["oll-cross-l", ["2-Look OLL"]],
    ["oll-cross-dot", ["2-Look OLL"]],
    ["pll-corners-adjacent", ["2-Look PLL"]],
    ["pll-corners-diagonal", ["2-Look PLL"]],
  ])("%s belongs to %j only", (id, sets) => {
    expect(ALL_CASES.find((c) => c.id === id)?.sets).toEqual(sets);
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
