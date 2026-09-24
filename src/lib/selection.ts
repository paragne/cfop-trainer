import { CASE_SETS } from "../data/algorithms.ts";
import type { Case, CaseSet } from "../data/algorithms.ts";

// A filter over cases, so a case in two chosen sets is still one case.
export const inSets = (cases: readonly Case[], sets: readonly CaseSet[]): Case[] =>
  cases.filter((c) => c.sets.some((set) => sets.includes(set)));

// A set is offered only once it holds a case, so a set whose data has not
// landed yet can never be chosen and started empty.
export const offeredSets = (cases: readonly Case[]): CaseSet[] =>
  CASE_SETS.filter((set) => cases.some((c) => c.sets.includes(set)));
