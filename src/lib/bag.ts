import type { Case } from "../data/algorithms.ts";
import { shuffle } from "./shuffle.ts";

// Each pass shows every case once, so coverage stays even where independent
// draws would cluster. A new pass never opens on the case just shown.
export function draw(
  pool: readonly Case[],
  bag: readonly Case[],
  previous: Case,
  random: () => number,
): { current: Case; bag: readonly Case[] } {
  let next = bag;
  if (next.length === 0) {
    next = shuffle(pool, random);
    if (next[0].id === previous.id) next = [...next.slice(1), next[0]];
  }
  const [current, ...rest] = next;
  return { current, bag: rest };
}
