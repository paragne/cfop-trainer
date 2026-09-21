import type { Case } from "../data/algorithms.ts";
import type { Progress } from "./progress.ts";
import { inSets } from "./selection.ts";
import { shuffle } from "./shuffle.ts";

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
  const pool = inSets(cases, progress.prefs.sets.drill);
  // Every set holds several cases, so this is a programmer error. One case
  // could not honor "no immediate repeat".
  if (pool.length < 2) throw new Error("drill needs at least two cases");
  const [current, ...bag] = shuffle(pool, random);
  return { current, pool, bag, shown: 1, revealed: progress.prefs.showSolutions };
}

// Each pass shows every case once, so coverage stays even where independent
// draws would cluster. A new pass never opens on the case just shown.
export function nextCase(d: Drill, progress: Progress, random: () => number): Drill {
  let bag = d.bag;
  if (bag.length === 0) {
    bag = shuffle(d.pool, random);
    if (bag[0].id === d.current.id) bag = [...bag.slice(1), bag[0]];
  }
  const [current, ...rest] = bag;
  return {
    current,
    pool: d.pool,
    bag: rest,
    shown: d.shown + 1,
    revealed: progress.prefs.showSolutions,
  };
}
