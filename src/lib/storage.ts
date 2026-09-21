import type { Case } from "../data/algorithms.ts";
import { defaultProgress, exportName, mergeProgress, parseProgress, serialize } from "./progress.ts";
import type { Progress } from "./progress.ts";

// The key is a name, not a version: the version lives in the blob.
const KEY = "cfop-trainer-v1";
const UNREADABLE_KEY = "cfop-trainer-v1:unreadable";

export type LoadResult = {
  progress: Progress;
  problem: "unreadable" | "unavailable" | null;
};

export type ImportMode = "merge" | "replace";

export type ImportResult =
  | { ok: true; progress: Progress; dropped: number; saved: boolean }
  | { ok: false; error: string };

// Blocked storage and a full quota both throw, and neither may reach the
// drilling loop.
function write(key: string, text: string): boolean {
  try {
    localStorage.setItem(key, text);
    return true;
  } catch {
    return false;
  }
}

export function load(cases: readonly Case[]): LoadResult {
  const fresh = defaultProgress(cases);
  let text: string | null;
  try {
    text = localStorage.getItem(KEY);
  } catch {
    return { progress: fresh, problem: "unavailable" };
  }
  if (text === null) return { progress: fresh, problem: null };

  const parsed = parseProgress(text, cases);
  if (parsed.ok) return { progress: parsed.progress, problem: null };

  // Set aside rather than leave in place: the first grade would overwrite the
  // only copy, and a blob from a newer version is not ours to destroy.
  write(UNREADABLE_KEY, text);
  return { progress: fresh, problem: "unreadable" };
}

export function save(progress: Progress, now: number): boolean {
  return write(KEY, serialize(progress, now));
}

export function exportJson(progress: Progress, now: number): { filename: string; text: string } {
  return { filename: exportName(new Date(now)), text: serialize(progress, now) };
}

export function importJson(
  text: string,
  mode: ImportMode,
  current: Progress,
  cases: readonly Case[],
  now: number,
): ImportResult {
  const parsed = parseProgress(text, cases);
  if (!parsed.ok) return parsed;
  const progress = mode === "merge" ? mergeProgress(current, parsed.progress) : parsed.progress;
  return { ok: true, progress, dropped: parsed.dropped, saved: save(progress, now) };
}
