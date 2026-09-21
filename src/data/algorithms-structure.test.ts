import { describe, expect, it } from "vitest";
import { setupCube } from "../lib/case-state.ts";
import { applyMoves, normalize, SOLVED } from "../lib/cube.ts";
import type { Cube } from "../lib/cube.ts";
import { invert, parse } from "../lib/notation.ts";
import { F2L_CASES, OLL_CASES, PLL_CASES } from "./algorithms.ts";

// Unlike the inverse-then-solution round trip, these checks can fail on a
// mistyped alg: each one asserts what the case's group says must be true.

const range = (from: number, to: number) =>
  Array.from({ length: to - from }, (_, i) => from + i);

const U_FACE = range(0, 9);
const U_EDGES = [1, 3, 5, 7];
const EVERYTHING = range(0, 54);
// The D face plus the lower two rows of R, F, L and B.
const F2L_STICKERS = [
  ...range(27, 36),
  ...[9, 18, 36, 45].flatMap((start) => range(start + 3, start + 9)),
];
const SLOT = { FR: [29, 26, 15, 23, 12], FL: [27, 24, 44, 21, 41] };

const unsolved = (cube: Cube, indices: number[]) =>
  indices.filter((i) => cube[i] !== SOLVED[i]);

const orientedEdges = (cube: Cube) => U_EDGES.filter((i) => cube[i] === "U");

// The U face plus the top row of each side face: everything OLL can see.
const LAST_LAYER_SIDES = [9, 10, 11, 18, 19, 20, 36, 37, 38, 45, 46, 47];

function orientationPattern(cube: Cube): string {
  const patterns: string[] = [];
  let turned = cube;
  for (let turn = 0; turn < 4; turn++) {
    patterns.push(
      [...U_FACE, ...LAST_LAYER_SIDES].map((i) => (turned[i] === "U" ? "1" : "0")).join(""),
    );
    turned = applyMoves(turned, parse("U"));
  }
  return patterns.toSorted()[0];
}

// Edges 1 and 7, and 3 and 5, are opposite, so opposite pairs sum to 8.
const CROSS_SHAPE: Record<string, (oriented: number[]) => boolean> = {
  "oll-cross-dot": (o) => o.length === 0,
  "oll-cross-l": (o) => o.length === 2 && o[0] + o[1] !== 8,
  "oll-cross-line": (o) => o.length === 2 && o[0] + o[1] === 8,
};

describe("F2L", () => {
  it.each(F2L_CASES)("$id: only the target slot is unsolved", (c) => {
    if (c.mask.kind !== "f2l") throw new Error(`${c.id} has no f2l mask`);
    const slot = SLOT[c.mask.slot];
    const cube = setupCube(c);
    expect(
      unsolved(cube, F2L_STICKERS).filter((i) => !slot.includes(i)),
    ).toEqual([]);
    expect(unsolved(cube, slot)).not.toEqual([]);
  });

  it.each(F2L_CASES.filter((c) => c.algs.length > 1))(
    "$id: every alternate alg also solves the pair",
    (c) => {
      for (const alt of c.algs.slice(1)) {
        const after = normalize(applyMoves(setupCube(c), parse(alt.moves)));
        expect(unsolved(after, F2L_STICKERS)).toEqual([]);
      }
    },
  );
});

describe("OLL", () => {
  it.each(OLL_CASES)("$id: the alg orients the last layer over intact F2L", (c) => {
    const cube = setupCube(c);
    expect(unsolved(cube, F2L_STICKERS)).toEqual([]);
    expect(unsolved(cube, U_FACE)).not.toEqual([]);

    const after = normalize(applyMoves(cube, parse(c.algs[0].moves)));
    expect(unsolved(after, [...F2L_STICKERS, ...U_FACE])).toEqual([]);
  });

  it.each(OLL_CASES.filter((c) => c.mask.kind === "oll-edges"))(
    "$id: has the cross shape its name claims",
    (c) => {
      expect(CROSS_SHAPE[c.id](orientedEdges(setupCube(c)))).toBe(true);
    },
  );

  it.each(OLL_CASES.filter((c) => c.algs.length > 1))(
    "$id: every alternate alg also orients the last layer",
    (c) => {
      for (const alt of c.algs.slice(1)) {
        const after = normalize(applyMoves(setupCube(c), parse(alt.moves)));
        expect(unsolved(after, [...F2L_STICKERS, ...U_FACE])).toEqual([]);
      }
    },
  );

  // A misnumbered or duplicated transcription would land two ids on one case.
  it("gives every Full OLL case its own orientation pattern up to a U turn", () => {
    const patterns = OLL_CASES.filter((c) => c.sets.includes("Full OLL")).map((c) =>
      orientationPattern(setupCube(c)),
    );
    expect(new Set(patterns).size).toBe(patterns.length);
  });

  // A 2-Look OLL fact, not an oll-full one: Full OLL holds cases with no cross.
  it.each(
    OLL_CASES.filter((c) => c.sets.includes("2-Look OLL") && c.mask.kind === "oll-full"),
  )(
    "$id: starts with the cross already made",
    (c) => {
      expect(orientedEdges(setupCube(c))).toHaveLength(4);
    },
  );
});

const AUFS = ["", "U", "U2", "U'"];

// Two algs are one case when their inverses, played on a solved cube, differ
// only by U turns before and after.
function caseSignature(alg: string): string {
  const inverse = invert(parse(alg));
  return AUFS.flatMap((before) =>
    AUFS.map((after) =>
      normalize(
        applyMoves(SOLVED, [...parse(before), ...inverse, ...parse(after)]),
      ).join(""),
    ),
  ).toSorted()[0];
}

describe("PLL", () => {
  it.each(PLL_CASES)("$id: only the permutation is wrong", (c) => {
    const cube = setupCube(c);
    expect(unsolved(cube, F2L_STICKERS)).toEqual([]);
    expect(unsolved(cube, U_FACE)).toEqual([]);
    expect(unsolved(cube, EVERYTHING)).not.toEqual([]);
  });

  // A displayed alg must leave the cube solved, so a sheet alg that ends one
  // AUF short gets the turn appended rather than a tolerance here.
  it.each(PLL_CASES.filter((c) => c.algs.length > 1))(
    "$id: every alternate alg solves the picture exactly",
    (c) => {
      for (const alt of c.algs.slice(1)) {
        const after = normalize(applyMoves(setupCube(c), parse(alt.moves)));
        expect(after).toEqual(SOLVED);
      }
    },
  );

  it("treats an alg and the same alg with AUFs around it as one case", () => {
    const ua = "R2 U' R' U' R U R U R U' R";
    expect(caseSignature(`U ${ua} U2`)).toBe(caseSignature(ua));
    const ub = "R' U R' U' R' U' R' U R U R2";
    expect(caseSignature(ub)).not.toBe(caseSignature(ua));
  });

  // A misnumbered or duplicated transcription would land two ids on one case.
  it("gives every Full PLL case its own signature up to AUF", () => {
    const signatures = PLL_CASES.filter((c) => c.sets.includes("Full PLL")).map((c) =>
      caseSignature(c.algs[0].moves),
    );
    expect(new Set(signatures).size).toBe(signatures.length);
  });
});
