import { CASE_SETS } from "../data/algorithms.ts";
import type { Case, CaseSet } from "../data/algorithms.ts";
import { isDue } from "./queue.ts";
import { inSets } from "./selection.ts";
import type { Card } from "./srs.ts";

type Cards = Readonly<Record<string, Card>>;

export type SetStats = {
  set: CaseSet;
  total: number;
  // Cases graded at least once, not attempts.
  seen: number;
  // Graded cases whose last grade was Know it, and those whose last grade was
  // Don't know: what is learned, and what is being worked on.
  learned: number;
  missed: number;
  // Known over seen, summed across the set's cards; null before any grade.
  accuracy: number | null;
  due: number;
};

export function dueCount(
  cases: readonly Case[],
  cards: Cards,
  sets: readonly CaseSet[],
  now: number,
): number {
  return inSets(cases, sets).filter((c) => isDue(cards[c.id], now)).length;
}

// Summing before dividing weights every attempt equally. Averaging per-card
// ratios would let a card tried once count as much as one tried twenty times.
export function setStats(cases: readonly Case[], cards: Cards, now: number): SetStats[] {
  return CASE_SETS.map((set) => {
    const members = inSets(cases, [set]);
    const graded = members.flatMap((c) => cards[c.id] ?? []);
    const attempts = graded.reduce((sum, card) => sum + card.seen, 0);
    const known = graded.reduce((sum, card) => sum + card.known, 0);
    const learned = graded.filter((card) => card.lastGrade === 1).length;
    return {
      set,
      total: members.length,
      seen: graded.length,
      learned,
      missed: graded.length - learned,
      accuracy: attempts === 0 ? null : known / attempts,
      due: dueCount(members, cards, [set], now),
    };
  });
}

export type Tick = "learned" | "missed" | "unseen";

// One tick per case, learned first, so a set's strip reads like a progress bar.
export function tickStates(learned: number, missed: number, total: number): Tick[] {
  return [
    ...Array<Tick>(learned).fill("learned"),
    ...Array<Tick>(missed).fill("missed"),
    ...Array<Tick>(total - learned - missed).fill("unseen"),
  ];
}
