import { describe, expect, it } from "vitest";
import { ALL_CASES, F2L_CASES, OLL_CASES, PLL_CASES } from "../data/algorithms.ts";
import { caseState } from "./case-state.ts";
import type { CaseState } from "./case-state.ts";
import { applyMoves, normalize, SOLVED } from "./cube.ts";
import { parse } from "./notation.ts";

const colored = (state: CaseState) =>
  state.flatMap((facelet, i) => (facelet === "masked" ? [] : [i]));

const U_FACE = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const U_EDGES = [1, 3, 5, 7];
// Middle sticker of the top row of R, F, L and B.
const EDGE_SIDES = [10, 19, 37, 46];
// Edges 1 and 7, and 3 and 5, are opposite, so oriented edges are counted by name.
const ORIENTED_EDGES: Record<string, number> = {
  "oll-cross-dot": 0,
  "oll-cross-l": 2,
  "oll-cross-line": 2,
};

const AUFS = ["", "U", "U'", "U2"];
const solvedAfterAuf = (setup: string, alg: string) =>
  AUFS.some((auf) =>
    normalize(
      applyMoves(applyMoves(SOLVED, parse(setup)), parse(`${auf} ${alg}`)),
    ).every((color, i) => color === SOLVED[i]),
  );

// Only these can fail on a bad case or a bad mask tag. A check that the alg
// solves the colored stickers is left out on purpose: the alg solves the whole
// cube, so every mask would pass it.
describe("F2L masks", () => {
  it.each(F2L_CASES)("$id: a colored sticker is out of place", (c) => {
    const state = caseState(c);
    expect(
      state.some((facelet, i) => facelet !== "masked" && facelet !== SOLVED[i]),
    ).toBe(true);
  });

  // Restates the selection rule, so it only catches a corrupted PIECES.
  it.each(F2L_CASES)("$id: colors one corner and one edge", (c) => {
    if (c.mask.kind !== "f2l") throw new Error(`${c.id} has no f2l mask`);
    const state = caseState(c);
    const side = c.mask.slot === "FR" ? "R" : "L";
    expect(colored(state).map((i) => state[i]).toSorted()).toEqual(
      ["D", "F", "F", side, side].toSorted(),
    );
  });
});

describe("OLL masks", () => {
  it.each(OLL_CASES.filter((c) => c.mask.kind === "oll-full"))(
    "$id: colors all nine U stickers, sideways ones included",
    (c) => {
      const state = caseState(c);
      expect(colored(state)).toHaveLength(9);
      expect(colored(state).every((i) => state[i] === "U")).toBe(true);
    },
  );

  it.each(OLL_CASES.filter((c) => c.mask.kind === "oll-edges"))(
    "$id: colors the center and one U sticker per edge",
    (c) => {
      const kept = colored(caseState(c));
      expect(kept).toHaveLength(5);
      expect(kept.filter((i) => U_EDGES.includes(i))).toHaveLength(
        ORIENTED_EDGES[c.id],
      );
    },
  );
});

describe("PLL masks", () => {
  it.each(PLL_CASES.filter((c) => c.mask.kind === "pll-corners"))(
    "$id: colors the corners and a solid U face, leaving edge side stickers gray",
    (c) => {
      const state = caseState(c);
      const kept = colored(state);
      expect(kept).toHaveLength(17);
      expect(kept.filter((i) => U_FACE.includes(i))).toEqual(U_FACE);
      expect(U_FACE.every((i) => state[i] === "U")).toBe(true);
      expect(EDGE_SIDES.some((i) => kept.includes(i))).toBe(false);
    },
  );

  it.each(PLL_CASES.filter((c) => c.mask.kind === "pll-full"))(
    "$id: colors all 21 last layer stickers",
    (c) => {
      expect(colored(caseState(c))).toHaveLength(21);
    },
  );
});

// Vacuous while every setup is null, so the predicate is checked on its own.
describe("setup overrides", () => {
  it.each([
    ["R U' R'", "R U R'", true],
    ["R U' R'", "R U2 R'", false],
    ["R U' R' U", "R U R'", true],
  ])("%s with %s is %s", (setup, alg, expected) => {
    expect(solvedAfterAuf(setup, alg)).toBe(expected);
  });

  it.each(
    ALL_CASES.flatMap((c) =>
      c.setup === null ? [] : [{ id: c.id, setup: c.setup, alg: c.algs[0].moves }],
    ),
  )("$id: setup is solved by algs[0] up to an AUF", ({ setup, alg }) => {
    expect(solvedAfterAuf(setup, alg)).toBe(true);
  });
});
