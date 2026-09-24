import type { Case } from "../data/algorithms.ts";
import type { Orderer } from "./shuffle.ts";
import type { Card } from "./srs.ts";

// A case never graded has no card and is due: the session queue takes it, and
// the home screen's due count has to agree with what Start will queue.
export const isDue = (card: Card | undefined, now: number): boolean =>
  card === undefined || card.due <= now;

export function buildQueue(
  cases: readonly Case[],
  cards: Readonly<Record<string, Card>>,
  now: number,
  length: number,
  order: Orderer,
): Case[] {
  const dueNow = (c: Case) => isDue(cards[c.id], now);
  const due = order(cases.filter(dueNow)).slice(0, length);

  // A card that is not due has been graded, so seen >= 1 and the ratio is
  // defined. Ordering first, over a stable sort, settles ties the same way.
  const ratio = (c: Case) => cards[c.id].known / cards[c.id].seen;
  const fill = order(cases.filter((c) => !dueNow(c)))
    .sort((a, b) => ratio(a) - ratio(b))
    .slice(0, length - due.length);

  return [...due, ...fill];
}
