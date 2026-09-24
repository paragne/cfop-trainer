import { describe, expect, it } from "vitest";
import { ALL_CASES, OLL_CASES, PLL_CASES } from "../data/algorithms.ts";
import { caseMask, caseState } from "./case-state.ts";
import type { CaseState } from "./case-state.ts";
import { applyMoves, normalize, SOLVED, STICKERS } from "./cube.ts";
import { invert, parse } from "./notation.ts";
import { homeRotation } from "./orientation.ts";
import { applyAlgToCubies, homeCubies } from "./physical-cube.ts";
import { isKeptSticker } from "./sticker-mask.ts";

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

// Cross-checks the 2D mask (case-state.ts, position-slot based) against an
// independent computation on physical stickers (physical-cube.ts, piece-
// identity based) for every case, not just F2L — the two are expected to
// agree exactly, since isKeptSticker is the one shared rule either can call.
// The corrective rotation puts the physical cubies in the same reference
// frame case-state.ts's normalize() puts the flat array in (see
// orientation.ts: homeRotation is normalize()'s physical twin) — except for
// the four cases orientation.test.ts already documents as exceptions: a
// partial-depth move in the setup (d, M, a wide move) can displace centers
// in a way no single rigid rotation reproduces alongside the same corners
// and edges, so relabeling (normalize) and a real rotation (homeRotation)
// diverge. Not a mask bug; excluded the same way that test excludes them.
const ROTATION_EXCEPTIONS = ["f2l-slot-3", "f2l-slot-4", "f2l-slot-5", "oll-42"];
describe("physical sticker mask matches the 2D mask", () => {
  it.each(ALL_CASES.filter((c) => !ROTATION_EXCEPTIONS.includes(c.id)))("$id", (c) => {
    const setupMoves = c.setup === null ? invert(parse(c.algs[0].moves)) : parse(c.setup);
    const corrective = homeRotation(applyMoves(SOLVED, setupMoves));
    const cubies = applyAlgToCubies(applyAlgToCubies(homeCubies(), setupMoves), corrective);

    const key = (p: readonly number[], n: readonly number[]) => `${p}|${n}`;
    const physicalKept = new Map<string, boolean>();
    for (const cubie of cubies) {
      const pieceColors = cubie.faces.filter((f) => f.isSticker).map((f) => f.colors[0]);
      for (const face of cubie.faces) {
        if (!face.isSticker) continue;
        physicalKept.set(key(cubie.position, face.normal), isKeptSticker(caseMask(c), pieceColors, face.colors[0]));
      }
    }

    const expectedKept = new Set(colored(caseState(c)));
    STICKERS.forEach((home, i) => {
      const kept = physicalKept.get(key(home.position, home.normal));
      if (kept === undefined) throw new Error(`${c.id}: no physical sticker at home slot ${i}`);
      expect(kept).toBe(expectedKept.has(i));
    });
  });
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
