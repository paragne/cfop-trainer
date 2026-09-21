import type { Case, CaseSet } from "../data/algorithms.ts";

// A filter over cases, so a case in two chosen sets is still one case.
export const inSets = (cases: readonly Case[], sets: readonly CaseSet[]): Case[] =>
  cases.filter((c) => c.sets.some((set) => sets.includes(set)));
