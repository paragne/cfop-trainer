import type { Case } from "../data/algorithms.ts";
import { Invalid, isRecord, reject } from "./blob.ts";
import { migrateV1toV2 } from "./migrate.ts";
import { defaultPrefs, readPrefs } from "./prefs.ts";
import type { Prefs } from "./prefs.ts";
import { mergeTimedStats, readTimedStat, readVerifyStat } from "./progress-timed.ts";
import { EASE_FLOOR } from "./srs.ts";
import type { Card } from "./srs.ts";
import type { TimedStat, VerifyStat } from "./timed-stats.ts";

export type Progress = {
  prefs: Prefs;
  cards: Record<string, Card>;
  notes: Record<string, string>;
  drillStats: Record<string, TimedStat>;
  verifyStats: Record<string, VerifyStat>;
};

export type ParseResult =
  | { ok: true; progress: Progress; updatedAt: number; dropped: number; migrated: boolean }
  | { ok: false; error: string };

const VERSION = 2;

export function defaultProgress(): Progress {
  return { prefs: defaultPrefs(), cards: {}, notes: {}, drillStats: {}, verifyStats: {} };
}

export function serialize(progress: Progress, now: number): string {
  return JSON.stringify(
    {
      version: VERSION,
      updatedAt: now,
      prefs: progress.prefs,
      cards: progress.cards,
      notes: progress.notes,
      drillStats: progress.drillStats,
      verifyStats: progress.verifyStats,
    },
    null,
    2,
  );
}

// Local date on purpose: toISOString is UTC and would name an evening export
// for tomorrow west of Greenwich.
export function exportName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `cfop-progress-${date}.json`;
}

function section(raw: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = raw[key];
  return isRecord(value) ? value : reject(`"${key}" must be an object`);
}

// drillStats and verifyStats were added after v2's first release, so a blob
// written before them has no key at all, not an empty object.
function optionalSection(raw: Record<string, unknown>, key: string): Record<string, unknown> {
  return raw[key] === undefined ? {} : section(raw, key);
}

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

// seen >= 1 because a record only exists once the card has been graded, and the
// queue divides known by seen. No upper bound on ease, so the cap can change.
function readCard(id: string, raw: unknown): Card {
  if (!isRecord(raw)) return reject(`card ${id} must be an object`);
  const at = (field: string) => `card ${id}.${field}`;
  const seen = count(raw.seen, at("seen"), 1);
  const known = count(raw.known, at("known"), 0);
  if (known > seen) reject(`${at("known")} cannot exceed seen`);
  const lastGrade = raw.lastGrade;
  if (lastGrade !== 0 && lastGrade !== 1) reject(`${at("lastGrade")} must be 0 or 1`);
  return {
    ease: finite(raw.ease, at("ease"), EASE_FLOOR),
    interval: count(raw.interval, at("interval"), 0),
    reps: count(raw.reps, at("reps"), 0),
    due: finite(raw.due, at("due"), 0),
    seen,
    known,
    lastGrade,
  };
}

function read(text: string, cases: readonly Case[]) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return reject("not valid JSON");
  }
  if (!isRecord(parsed)) return reject("expected a JSON object");
  const migrated = parsed.version === 1;
  const raw = migrated ? migrateV1toV2(parsed) : parsed;
  if (raw.version !== VERSION) {
    return reject(`unsupported version ${JSON.stringify(raw.version)}`);
  }
  const updatedAt = finite(raw.updatedAt, "updatedAt", 0);
  const prefs = readPrefs(section(raw, "prefs"));

  // Unknown ids are dropped without reading the record: it is discarded anyway.
  const known = new Set(cases.map((c) => c.id));
  let dropped = 0;
  const cards: Record<string, Card> = {};
  for (const [id, value] of Object.entries(section(raw, "cards"))) {
    if (known.has(id)) cards[id] = readCard(id, value);
    else dropped++;
  }
  const notes: Record<string, string> = {};
  for (const [id, value] of Object.entries(section(raw, "notes"))) {
    if (!known.has(id)) {
      dropped++;
    } else if (typeof value !== "string") {
      reject(`note ${id} must be a string`);
    } else if (value !== "") {
      notes[id] = value;
    }
  }
  const drillStats: Record<string, TimedStat> = {};
  for (const [id, value] of Object.entries(optionalSection(raw, "drillStats"))) {
    if (known.has(id)) drillStats[id] = readTimedStat(id, value);
    else dropped++;
  }
  const verifyStats: Record<string, VerifyStat> = {};
  for (const [id, value] of Object.entries(optionalSection(raw, "verifyStats"))) {
    if (known.has(id)) verifyStats[id] = readVerifyStat(id, value);
    else dropped++;
  }
  return { progress: { prefs, cards, notes, drillStats, verifyStats }, updatedAt, dropped, migrated };
}

export function parseProgress(text: string, cases: readonly Case[]): ParseResult {
  try {
    return { ok: true, ...read(text, cases) };
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: e.message };
    throw e;
  }
}

// Two divergent histories of one card cannot be summed without counting
// reviews twice, so the longer history wins whole. Ties fall to the later due.
const hasMoreHistory = (a: Card, b: Card) =>
  a.seen !== b.seen ? a.seen > b.seen : a.due > b.due;

// A note is never dropped: text one side already contains adds nothing, and
// anything else is kept from both. Re-importing the same file is a no-op.
function mergeNote(local: string, imported: string): string {
  if (local.includes(imported)) return local;
  if (imported.includes(local)) return imported;
  return `${local}\n\n${imported}`;
}

export function mergeProgress(local: Progress, imported: Progress): Progress {
  const cards = { ...local.cards };
  for (const [id, theirs] of Object.entries(imported.cards)) {
    if (!(id in cards) || hasMoreHistory(theirs, cards[id])) cards[id] = theirs;
  }
  const notes = { ...local.notes };
  for (const [id, theirs] of Object.entries(imported.notes)) {
    notes[id] = id in notes ? mergeNote(notes[id], theirs) : theirs;
  }
  const drillStats = mergeTimedStats(local.drillStats, imported.drillStats);
  const verifyStats = mergeTimedStats(local.verifyStats, imported.verifyStats);
  return { prefs: local.prefs, cards, notes, drillStats, verifyStats };
}
