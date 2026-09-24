import { CASE_SETS } from "../data/algorithms.ts";
import type { Case, CaseSet } from "../data/algorithms.ts";

// The order the home screen lists the sets in, top to bottom. It is also the
// order an unshuffled session walks them.
export const SET_ORDER: readonly CaseSet[] = [
  "F2L",
  "Advanced F2L",
  "Expert F2L",
  "2-Look OLL",
  "Full OLL",
  "2-Look PLL",
  "Full PLL",
];

// A filter over cases, so a case in two chosen sets is still one case.
export const inSets = (cases: readonly Case[], sets: readonly CaseSet[]): Case[] =>
  cases.filter((c) => c.sets.some((set) => sets.includes(set)));

// The same cases, walked set by set in SET_ORDER with each set in data order.
// A case in two chosen sets sits with the first. This is the order an
// unshuffled session follows.
export const inReadingOrder = (cases: readonly Case[], sets: readonly CaseSet[]): Case[] => {
  const chosen = SET_ORDER.filter((set) => sets.includes(set));
  return [...new Set(chosen.flatMap((set) => cases.filter((c) => c.sets.includes(set))))];
};

// A set is offered only once it holds a case, so a set whose data has not
// landed yet can never be chosen and started empty.
export const offeredSets = (cases: readonly Case[]): CaseSet[] =>
  CASE_SETS.filter((set) => cases.some((c) => c.sets.includes(set)));
