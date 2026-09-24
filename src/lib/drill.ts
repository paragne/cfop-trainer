import type { Case } from "../data/algorithms.ts";
import { draw } from "./bag.ts";
import type { Progress } from "./progress.ts";
import { inReadingOrder } from "./selection.ts";
import { orderer } from "./shuffle.ts";

export type Drill = {
  current: Case;
  pool: readonly Case[];
  // Cases still to come in this pass over the pool.
  bag: readonly Case[];
  shown: number;
  revealed: boolean;
};

export function startDrill(
  cases: readonly Case[],
  progress: Progress,
  random: () => number,
): Drill {
  const pool = inReadingOrder(cases, progress.prefs.sets.drill);
  // Every set holds several cases, so this is a programmer error. One case
  // could not honor "no immediate repeat".
  if (pool.length < 2) throw new Error("drill needs at least two cases");
  const [current, ...bag] = orderer(progress.prefs.shuffle, random)(pool);
  return { current, pool, bag, shown: 1, revealed: progress.prefs.showSolutions };
}

export function nextCase(d: Drill, progress: Progress, random: () => number): Drill {
  const { current, bag } = draw(d.pool, d.bag, d.current, orderer(progress.prefs.shuffle, random));
  return {
    current,
    pool: d.pool,
    bag,
    shown: d.shown + 1,
    revealed: progress.prefs.showSolutions,
  };
}
