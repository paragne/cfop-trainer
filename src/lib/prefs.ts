import { CASE_SETS } from "../data/algorithms.ts";
import type { CaseSet } from "../data/algorithms.ts";
import { isRecord, reject } from "./blob.ts";

export type Mode = "learn" | "drill" | "verify";

export type Prefs = {
  showNames: boolean;
  showSolutions: boolean;
  sets: Record<Mode, CaseSet[]>;
};

// The full sets are opt-in: they add about a hundred cases to a session queue
// of twenty. Verify never offers F2L.
export function defaultPrefs(): Prefs {
  return {
    showNames: true,
    showSolutions: false,
    sets: {
      learn: ["F2L", "2-Look OLL", "2-Look PLL"],
      drill: ["F2L", "2-Look OLL", "2-Look PLL"],
      verify: ["2-Look OLL", "2-Look PLL"],
    },
  };
}

function readSetList(value: unknown, where: string): CaseSet[] {
  if (!Array.isArray(value) || value.length === 0) {
    return reject(`${where} must be a non-empty list`);
  }
  return value.map(
    (s: unknown) =>
      CASE_SETS.find((known) => known === s) ??
      reject(`${where} has unknown set ${JSON.stringify(s)}`),
  );
}

function readSets(value: unknown, defaults: Prefs["sets"]): Prefs["sets"] {
  if (!isRecord(value)) return reject("prefs.sets must be an object");
  const list = (mode: Mode) =>
    value[mode] === undefined ? defaults[mode] : readSetList(value[mode], `prefs.sets.${mode}`);
  return { learn: list("learn"), drill: list("drill"), verify: list("verify") };
}

// A missing pref takes its default, which is what lets a new pref ship
// without bumping the version.
export function readPrefs(raw: Record<string, unknown>): Prefs {
  const defaults = defaultPrefs();
  const flag = (key: "showNames" | "showSolutions"): boolean => {
    const value = raw[key];
    if (value === undefined) return defaults[key];
    return typeof value === "boolean" ? value : reject(`prefs.${key} must be true or false`);
  };
  return {
    showNames: flag("showNames"),
    showSolutions: flag("showSolutions"),
    sets: raw.sets === undefined ? defaults.sets : readSets(raw.sets, defaults.sets),
  };
}
