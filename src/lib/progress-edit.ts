import type { CaseSet } from "../data/algorithms.ts";
import type { Mode } from "./prefs.ts";
import type { Progress } from "./progress.ts";

// An empty note is deleted rather than stored, matching what parsing does with
// an empty string, so clearing a note and reloading agree.
export function setNote(progress: Progress, id: string, text: string): Progress {
  const notes = { ...progress.notes };
  if (text === "") delete notes[id];
  else notes[id] = text;
  return { ...progress, notes };
}

export function setPref(
  progress: Progress,
  key: "showNames" | "showSolutions" | "randomRotation" | "shuffle" | "threeD",
  value: boolean,
): Progress {
  return { ...progress, prefs: { ...progress.prefs, [key]: value } };
}

export function setNumberPref(progress: Progress, key: "speed" | "zoom", value: number): Progress {
  return { ...progress, prefs: { ...progress.prefs, [key]: value } };
}

export function setMode(progress: Progress, mode: Mode): Progress {
  return { ...progress, prefs: { ...progress.prefs, mode } };
}

// Returns the same object when the last set would be switched off, so the
// caller can tell nothing changed and an empty session never arises.
export function toggleSet(progress: Progress, mode: Mode, set: CaseSet): Progress {
  const selected = progress.prefs.sets[mode];
  if (!selected.includes(set)) {
    return withSets(progress, mode, [...selected, set]);
  }
  if (selected.length === 1) return progress;
  return withSets(progress, mode, selected.filter((s) => s !== set));
}

const withSets = (progress: Progress, mode: Mode, selected: CaseSet[]): Progress => ({
  ...progress,
  prefs: { ...progress.prefs, sets: { ...progress.prefs.sets, [mode]: selected } },
});
