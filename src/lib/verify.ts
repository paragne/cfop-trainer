import type { Case } from "../data/algorithms.ts";
import { pickAuf, prefixed } from "./auf.ts";
import type { Auf } from "./auf.ts";
import { draw } from "./bag.ts";
import { applyMoves, normalize, SOLVED } from "./cube.ts";
import type { Cube } from "./cube.ts";
import { parse } from "./notation.ts";
import type { Progress } from "./progress.ts";
import { inReadingOrder } from "./selection.ts";
import { orderer } from "./shuffle.ts";

export type Phase = "ready" | "attempt" | "checked" | "missed";

export type Verify = {
  pool: readonly Case[];
  bag: readonly Case[];
  current: Case;
  // The cumulative engine state before this step: SOLVED at the start and
  // after a Reset, otherwise wherever the last step's Match left it.
  cube: Cube;
  auf: Auf;
  // Index into current.algs; 0 at every new step. See choose().
  chosen: number;
  phase: Phase;
  step: number;
  matches: number;
};

export function startVerify(
  cases: readonly Case[],
  progress: Progress,
  random: () => number,
): Verify {
  const pool = inReadingOrder(cases, progress.prefs.sets.verify);
  // Every set holds several cases, so this is a programmer error, as in Drill.
  if (pool.length < 2) throw new Error("verify needs at least two cases");
  const [current, ...bag] = orderer(progress.prefs.shuffle, random)(pool);
  return {
    pool,
    bag,
    current,
    cube: SOLVED,
    auf: pickAuf(current, progress.prefs.randomRotation, random),
    chosen: 0,
    phase: "ready",
    step: 1,
    matches: 0,
  };
}

export const begin = (v: Verify): Verify => ({ ...v, phase: "attempt" });
export const check = (v: Verify): Verify => ({ ...v, phase: "checked" });
export const choose = (v: Verify, chosen: number): Verify => ({ ...v, chosen });

function expectedFor(v: Verify, i: number): Cube {
  return applyMoves(v.cube, parse(prefixed(v.auf, v.current.algs[i].moves)));
}

// The cumulative engine state after every algorithm so far, including this
// step's. Never normalized: that is what makes a displaced center visible,
// and what lets Reset tell a discarded attempt from a real solve.
export const expected = (v: Verify): Cube => expectedFor(v, v.chosen);

// Non-empty only when the algs genuinely disagree on where this case lands
// from the current cube. Today that is oll-24 and oll-25: their alternates
// orient the case correctly but permute it differently. A PLL alternate is
// the identical permutation and never appears here.
export function choices(v: Verify): readonly number[] {
  if (v.current.algs.length < 2) return [];
  const outcomes = new Set(v.current.algs.map((_, i) => expectedFor(v, i).join("")));
  return outcomes.size > 1 ? v.current.algs.map((_, i) => i) : [];
}

// Centers are colors, not positions: normalize() relabels colors by where
// they currently sit, and the two agree exactly when the centers are already
// home. Reused here instead of re-deriving the center indices a second time.
const centersHome = (cube: Cube): boolean => normalize(cube).every((color, i) => color === cube[i]);

// Every legal move sequence permutes the six centers among themselves, so a
// cube's actual orientation is always one of the 24 whole-cube rotations. The
// nine face-axis turns reach ten of them (identity plus each turn); composing
// two reaches the rest (vertex and edge rotations).
const ROTATIONS = ["x", "x'", "x2", "y", "y'", "y2", "z", "z'", "z2"] as const;

// The regrip a solver makes by habit after an algorithm like oll-42 leaves
// the cube rotated: the shortest whole-cube turn that restores home centers,
// i.e. green front, yellow up. Applied on Match, never normalized:
// cube.test.ts documents why normalizing instead would silently discard the
// very rotation this is reporting.
export function regrip(cube: Cube): readonly string[] {
  if (centersHome(cube)) return [];
  for (const first of ROTATIONS) {
    if (centersHome(applyMoves(cube, parse(first)))) return [first];
  }
  for (const first of ROTATIONS) {
    for (const second of ROTATIONS) {
      if (centersHome(applyMoves(applyMoves(cube, parse(first)), parse(second)))) {
        return [first, second];
      }
    }
  }
  throw new Error("no whole-cube rotation restores home centers");
}

function advance(v: Verify, cube: Cube, progress: Progress, random: () => number): Verify {
  const { current, bag } = draw(v.pool, v.bag, v.current, orderer(progress.prefs.shuffle, random));
  return {
    ...v,
    current,
    bag,
    cube,
    auf: pickAuf(current, progress.prefs.randomRotation, random),
    chosen: 0,
    phase: "attempt",
    step: v.step + 1,
  };
}

export function judge(
  v: Verify,
  match: boolean,
  progress: Progress,
  random: () => number,
): Verify {
  if (!match) return { ...v, phase: "missed" };
  const e = expected(v);
  const cube = applyMoves(e, parse(regrip(e).join(" ")));
  return advance({ ...v, matches: v.matches + 1 }, cube, progress, random);
}

export function reset(v: Verify, progress: Progress, random: () => number): Verify {
  return advance(v, SOLVED, progress, random);
}
