import type { Case } from "../data/algorithms.ts";

// The one alg per case the user has marked as their default, used by the 3D
// view, Verify's expected result and the seconds-per-move stat. A stored
// index the case's algs no longer reach (the data file shrank since it was
// set) falls back to the primary rather than erroring.
export function starredAlg(c: Case, stars: Readonly<Record<string, number>>): number {
  const i = stars[c.id];
  return i !== undefined && i < c.algs.length ? i : 0;
}
