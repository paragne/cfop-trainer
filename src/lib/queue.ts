import type { Case } from "../data/algorithms.ts";
import { shuffle } from "./shuffle.ts";
import type { Card } from "./srs.ts";

export function buildQueue(
  cases: readonly Case[],
  cards: Readonly<Record<string, Card>>,
  now: number,
  length: number,
  random: () => number,
): Case[] {
  const isDue = (c: Case) => cards[c.id] === undefined || cards[c.id].due <= now;
  const due = shuffle(cases.filter(isDue), random).slice(0, length);

  // A card that is not due has been graded, so seen >= 1 and the ratio is
  // defined. Shuffling first, over a stable sort, randomizes ties.
  const ratio = (c: Case) => cards[c.id].known / cards[c.id].seen;
  const fill = shuffle(cases.filter((c) => !isDue(c)), random)
    .sort((a, b) => ratio(a) - ratio(b))
    .slice(0, length - due.length);

  return [...due, ...fill];
}
