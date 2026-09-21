import type { CaseSet } from "../data/algorithms.ts";
import { isRecord } from "./blob.ts";

// v1 had one mode and three groups. Its OLL and PLL were the 2-look sets: the
// full ones did not exist yet.
const SET_OF_GROUP = new Map<string, CaseSet>([
  ["F2L", "F2L"],
  ["OLL", "2-Look OLL"],
  ["PLL", "2-Look PLL"],
]);

const toSet = (group: unknown) =>
  typeof group === "string" ? (SET_OF_GROUP.get(group) ?? group) : group;

// Total on purpose: it maps what it recognizes and passes the rest through, so
// a malformed v1 blob is rejected by the ordinary v2 reader and there is one
// place that decides what is valid. Cards, notes and updatedAt are untouched.
export function migrateV1toV2(raw: Record<string, unknown>): Record<string, unknown> {
  const { prefs } = raw;
  if (!isRecord(prefs)) return { ...raw, version: 2 };
  const { groups, ...rest } = prefs;
  if (groups === undefined) return { ...raw, version: 2, prefs: rest };
  const learn = Array.isArray(groups) ? groups.map(toSet) : groups;
  return { ...raw, version: 2, prefs: { ...rest, sets: { learn } } };
}
