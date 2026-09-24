import type { Case } from "../data/algorithms.ts";
import type { Orderer } from "./shuffle.ts";

// Each pass shows every case once, so coverage stays even where independent
// draws would cluster. A new pass never opens on the case just shown: the
// pool has two or more cases, and an unshuffled pass opens on its first.
export function draw(
  pool: readonly Case[],
  bag: readonly Case[],
  previous: Case,
  order: Orderer,
): { current: Case; bag: readonly Case[] } {
  let next = bag;
  if (next.length === 0) {
    next = order(pool);
    if (next[0].id === previous.id) next = [...next.slice(1), next[0]];
  }
  const [current, ...rest] = next;
  return { current, bag: rest };
}
