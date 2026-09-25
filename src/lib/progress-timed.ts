import { isRecord, reject } from "./blob.ts";
import type { TimedStat, VerifyStat } from "./timed-stats.ts";

function finite(value: unknown, where: string, min: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min) {
    return reject(`${where} must be a number >= ${min}`);
  }
  return value;
}

function count(value: unknown, where: string, min: number): number {
  const n = finite(value, where, min);
  if (!Number.isInteger(n)) reject(`${where} must be a whole number`);
  return n;
}

// A timed stat is an aggregate, not an event log, so its own invariants hold
// regardless of how it was produced: the total covers every attempt including
// the latest and the best, so neither can exceed it, and the best can never
// be slower than the latest attempt that could have set it.
export function readTimedStat(id: string, raw: unknown): TimedStat {
  if (!isRecord(raw)) return reject(`stat ${id} must be an object`);
  const at = (field: string) => `stat ${id}.${field}`;
  const attempts = count(raw.attempts, at("attempts"), 1);
  const totalMs = finite(raw.totalMs, at("totalMs"), 0);
  const bestMs = finite(raw.bestMs, at("bestMs"), 0);
  const lastMs = finite(raw.lastMs, at("lastMs"), 0);
  if (bestMs > totalMs) reject(`${at("bestMs")} cannot exceed totalMs`);
  if (lastMs > totalMs) reject(`${at("lastMs")} cannot exceed totalMs`);
  if (bestMs > lastMs) reject(`${at("bestMs")} cannot exceed lastMs`);
  return { attempts, totalMs, bestMs, lastMs };
}

export function readVerifyStat(id: string, raw: unknown): VerifyStat {
  if (!isRecord(raw)) return reject(`stat ${id} must be an object`);
  const base = readTimedStat(id, raw);
  const matches = count(raw.matches, `stat ${id}.matches`, 0);
  if (matches > base.attempts) reject(`stat ${id}.matches cannot exceed attempts`);
  return { ...base, matches };
}

// Same rule as a card's history: a timed stat is an aggregate, so two
// divergent ones cannot be summed without double-counting, and the side with
// more attempts wins whole.
export function mergeTimedStats<T extends TimedStat>(
  local: Readonly<Record<string, T>>,
  imported: Readonly<Record<string, T>>,
): Record<string, T> {
  const merged = { ...local };
  for (const [id, theirs] of Object.entries(imported)) {
    if (!(id in merged) || theirs.attempts > merged[id].attempts) merged[id] = theirs;
  }
  return merged;
}
