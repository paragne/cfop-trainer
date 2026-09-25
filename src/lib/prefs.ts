import { CASE_SETS, SET_GROUP } from "../data/algorithms.ts";
import type { CaseSet } from "../data/algorithms.ts";
import { isRecord, reject } from "./blob.ts";

export type Mode = "learn" | "drill" | "verify";

// Which key labels the card screens show. Mobile is detected, never stored:
// a touch-primary device always shows no labels, regardless of this pref.
export type HotkeyLabels = "numpad" | "keyboard";
const HOTKEY_LABELS: readonly HotkeyLabels[] = ["numpad", "keyboard"];

// Only modes that exist can be remembered as the last one used.
export const SHIPPED_MODES: readonly Mode[] = ["learn", "drill", "verify"];

export type Prefs = {
  showNames: boolean;
  showSolutions: boolean;
  showNotes: boolean;
  randomRotation: boolean;
  shuffle: boolean;
  mode: Mode;
  sets: Record<Mode, CaseSet[]>;
  threeD: boolean;
  speed: number;
  zoom: number;
  hotkeyLabels: HotkeyLabels;
};

// The playback speeds the 3D view offers, as multipliers of the base pace.
export const SPEEDS = [0.2, 0.5, 1, 2, 4, 10] as const;
// A multiplier on the size that fits the canvas, so 1 is always "fills it".
export const ZOOM_RANGE = { min: 0.5, max: 3 } as const;

// The full sets are opt-in: they add about a hundred cases to a session queue
// of twenty. Verify never offers an F2L set.
export function defaultPrefs(): Prefs {
  return {
    showNames: true,
    showSolutions: false,
    showNotes: true,
    randomRotation: false,
    shuffle: true,
    mode: "learn",
    threeD: false,
    speed: 1,
    zoom: 1,
    hotkeyLabels: "keyboard",
    sets: {
      learn: ["F2L", "2-Look OLL", "2-Look PLL"],
      drill: ["F2L", "2-Look OLL", "2-Look PLL"],
      verify: ["2-Look OLL", "2-Look PLL"],
    },
  };
}

function readSetList(value: unknown, where: string): CaseSet[] {
  if (!Array.isArray(value)) return reject(`${where} must be a list`);
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

function readHotkeyLabels(value: unknown, fallback: HotkeyLabels): HotkeyLabels {
  if (value === undefined) return fallback;
  return (
    HOTKEY_LABELS.find((mode) => mode === value) ??
    reject(`prefs.hotkeyLabels must be one of ${HOTKEY_LABELS.join(", ")}`)
  );
}

function readMode(value: unknown, fallback: Mode): Mode {
  if (value === undefined) return fallback;
  return (
    SHIPPED_MODES.find((mode) => mode === value) ??
    reject(`prefs.mode must be one of ${SHIPPED_MODES.join(", ")}`)
  );
}

// A speed saved by an earlier build's slider snaps to the nearest choice
// instead of discarding the whole blob.
function readSpeed(value: unknown, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value)) return reject("prefs.speed must be a number");
  return SPEEDS.reduce((best, s) => (Math.abs(s - value) < Math.abs(best - value) ? s : best));
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
  const flag = (key: "showNames" | "showSolutions" | "showNotes" | "randomRotation" | "shuffle" | "threeD"): boolean => {
    const value = raw[key];
    if (value === undefined) return defaults[key];
    return typeof value === "boolean" ? value : reject(`prefs.${key} must be true or false`);
  };
  return {
    showNames: flag("showNames"),
    showSolutions: flag("showSolutions"),
    showNotes: flag("showNotes"),
    randomRotation: flag("randomRotation"),
    shuffle: flag("shuffle"),
    mode: readMode(raw.mode, defaults.mode),
    sets: raw.sets === undefined ? defaults.sets : readSets(raw.sets, defaults.sets),
    threeD: flag("threeD"),
    speed: readSpeed(raw.speed, defaults.speed),
    zoom: readInRange(raw.zoom, ZOOM_RANGE, defaults.zoom, "prefs.zoom"),
    hotkeyLabels: readHotkeyLabels(raw.hotkeyLabels, defaults.hotkeyLabels),
  };
}
