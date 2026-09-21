import type { Case, Group } from "../data/algorithms.ts";
import { EASE_FLOOR } from "./srs.ts";
import type { Card } from "./srs.ts";

export type Prefs = {
  showNames: boolean;
  showSolutions: boolean;
  groups: Group[];
};

export type Progress = {
  prefs: Prefs;
  cards: Record<string, Card>;
  notes: Record<string, string>;
};

export type ParseResult =
  | { ok: true; progress: Progress; updatedAt: number; dropped: number }
  | { ok: false; error: string };

const VERSION = 1;

const groupsOf = (cases: readonly Case[]): Group[] => [
  ...new Set(cases.map((c) => c.group)),
];

export function defaultProgress(cases: readonly Case[]): Progress {
  return {
    prefs: { showNames: true, showSolutions: false, groups: groupsOf(cases) },
    cards: {},
    notes: {},
  };
}

export function serialize(progress: Progress, now: number): string {
  return JSON.stringify(
    {
      version: VERSION,
      updatedAt: now,
      prefs: progress.prefs,
      cards: progress.cards,
      notes: progress.notes,
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

class Invalid extends Error {}

function reject(message: string): never {
  throw new Invalid(message);
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function section(raw: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = raw[key];
  return isRecord(value) ? value : reject(`"${key}" must be an object`);
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

function readGroups(value: unknown, known: readonly Group[]): Group[] {
  if (!Array.isArray(value) || value.length === 0) {
    return reject("prefs.groups must be a non-empty list");
  }
  return value.map(
    (g: unknown) =>
      known.find((k) => k === g) ?? reject(`prefs.groups has unknown group ${JSON.stringify(g)}`),
  );
}

// A missing pref takes its default, which is what lets a new pref ship
// without bumping the version.
function readPrefs(raw: Record<string, unknown>, defaults: Prefs): Prefs {
  const flag = (key: "showNames" | "showSolutions"): boolean => {
    const value = raw[key];
    if (value === undefined) return defaults[key];
    return typeof value === "boolean" ? value : reject(`prefs.${key} must be true or false`);
  };
  return {
    showNames: flag("showNames"),
    showSolutions: flag("showSolutions"),
    groups: raw.groups === undefined ? defaults.groups : readGroups(raw.groups, defaults.groups),
  };
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
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return reject("not valid JSON");
  }
  if (!isRecord(raw)) return reject("expected a JSON object");
  if (raw.version !== VERSION) {
    return reject(`unsupported version ${JSON.stringify(raw.version)}`);
  }
  const updatedAt = finite(raw.updatedAt, "updatedAt", 0);
  const prefs = readPrefs(section(raw, "prefs"), defaultProgress(cases).prefs);

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
  return { progress: { prefs, cards, notes }, updatedAt, dropped };
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
  return { prefs: local.prefs, cards, notes };
}
