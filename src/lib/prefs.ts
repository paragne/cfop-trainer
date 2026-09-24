import { CASE_SETS, SET_GROUP } from "../data/algorithms.ts";
import type { CaseSet } from "../data/algorithms.ts";
import { isRecord, reject } from "./blob.ts";

export type Mode = "learn" | "drill" | "verify";

// Only modes that exist can be remembered as the last one used.
export const SHIPPED_MODES: readonly Mode[] = ["learn", "drill", "verify"];

export type Prefs = {
  showNames: boolean;
  showSolutions: boolean;
  randomRotation: boolean;
  mode: Mode;
  sets: Record<Mode, CaseSet[]>;
  verifyLength: VerifyLength;
  threeD: boolean;
  speed: number;
  zoom: number;
};

// The 3D view's speed slider shares this with the validation below, so a
// stored value can never sit outside what the slider can show.
export const SPEED_RANGE = { min: 0.25, max: 4, step: 0.25 } as const;
// A multiplier on the size that fits the canvas, so 1 is always "fills it".
export const ZOOM_RANGE = { min: 0.5, max: 3 } as const;

export const VERIFY_LENGTHS = [5, 10, 20] as const;
export type VerifyLength = (typeof VERIFY_LENGTHS)[number];

// The full sets are opt-in: they add about a hundred cases to a session queue
// of twenty. Verify never offers an F2L set.
export function defaultPrefs(): Prefs {
  return {
    showNames: true,
    showSolutions: false,
    randomRotation: false,
    mode: "learn",
    verifyLength: 10,
    threeD: false,
    speed: 1,
    zoom: 1,
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

// Verify never offers an F2L set, so one here can only come from a hand-edited
// import, not the UI, and is rejected rather than silently dropped.
function readSets(value: unknown, defaults: Prefs["sets"]): Prefs["sets"] {
  if (!isRecord(value)) return reject("prefs.sets must be an object");
  const list = (mode: Mode) =>
    value[mode] === undefined ? defaults[mode] : readSetList(value[mode], `prefs.sets.${mode}`);
  const verify = list("verify");
  if (verify.some((set) => SET_GROUP[set] === "F2L")) reject("prefs.sets.verify must not include an F2L set");
  return { learn: list("learn"), drill: list("drill"), verify };
}

function readMode(value: unknown, fallback: Mode): Mode {
  if (value === undefined) return fallback;
  return (
    SHIPPED_MODES.find((mode) => mode === value) ??
    reject(`prefs.mode must be one of ${SHIPPED_MODES.join(", ")}`)
  );
}

// A missing pref takes its default, which is what lets a new pref ship
// without bumping the version.
function readVerifyLength(value: unknown, fallback: VerifyLength): VerifyLength {
  if (value === undefined) return fallback;
  return VERIFY_LENGTHS.find((n) => n === value) ?? reject(`prefs.verifyLength must be one of ${VERIFY_LENGTHS.join(", ")}`);
}

function readInRange(
  value: unknown,
  range: { min: number; max: number },
  fallback: number,
  where: string,
): number {
  if (value === undefined) return fallback;
  if (typeof value === "number" && value >= range.min && value <= range.max) return value;
  return reject(`${where} must be a number from ${range.min} to ${range.max}`);
}

export function readPrefs(raw: Record<string, unknown>): Prefs {
  const defaults = defaultPrefs();
  const flag = (key: "showNames" | "showSolutions" | "randomRotation" | "threeD"): boolean => {
    const value = raw[key];
    if (value === undefined) return defaults[key];
    return typeof value === "boolean" ? value : reject(`prefs.${key} must be true or false`);
  };
  return {
    showNames: flag("showNames"),
    showSolutions: flag("showSolutions"),
    randomRotation: flag("randomRotation"),
    mode: readMode(raw.mode, defaults.mode),
    sets: raw.sets === undefined ? defaults.sets : readSets(raw.sets, defaults.sets),
    verifyLength: readVerifyLength(raw.verifyLength, defaults.verifyLength),
    threeD: flag("threeD"),
    speed: readInRange(raw.speed, SPEED_RANGE, defaults.speed, "prefs.speed"),
    zoom: readInRange(raw.zoom, ZOOM_RANGE, defaults.zoom, "prefs.zoom"),
  };
}
