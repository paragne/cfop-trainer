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
