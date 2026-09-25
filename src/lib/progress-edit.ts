import type { CaseSet } from "../data/algorithms.ts";
import type { HotkeyLabels, Mode } from "./prefs.ts";
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
  key: "showNames" | "showSolutions" | "showNotes" | "randomRotation" | "shuffle" | "threeD",
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

export function setHotkeyLabels(progress: Progress, hotkeyLabels: HotkeyLabels): Progress {
  return { ...progress, prefs: { ...progress.prefs, hotkeyLabels } };
}

// Every set can be switched off: with none selected the home screen offers no
// Start, so an empty session never arises.
export function toggleSet(progress: Progress, mode: Mode, set: CaseSet): Progress {
  const selected = progress.prefs.sets[mode];
  return withSets(progress, mode, selected.includes(set) ? selected.filter((s) => s !== set) : [...selected, set]);
}

const withSets = (progress: Progress, mode: Mode, selected: CaseSet[]): Progress => ({
  ...progress,
  prefs: { ...progress.prefs, sets: { ...progress.prefs.sets, [mode]: selected } },
});
