import type { Group } from "../data/algorithms.ts";
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
  key: "showNames" | "showSolutions",
  value: boolean,
): Progress {
  return { ...progress, prefs: { ...progress.prefs, [key]: value } };
}

// Returns the same object when the last group would be switched off, so the
// caller can tell nothing changed and an empty session never arises.
export function toggleGroup(progress: Progress, group: Group): Progress {
  const { groups } = progress.prefs;
  if (!groups.includes(group)) {
    return { ...progress, prefs: { ...progress.prefs, groups: [...groups, group] } };
  }
  if (groups.length === 1) return progress;
  const remaining = groups.filter((g) => g !== group);
  return { ...progress, prefs: { ...progress.prefs, groups: remaining } };
}
