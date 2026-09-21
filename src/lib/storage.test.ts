import { afterEach, describe, expect, it, vi } from "vitest";
import { ALL_CASES } from "../data/algorithms.ts";
import { defaultProgress, parseProgress, serialize } from "./progress.ts";
import type { Progress } from "./progress.ts";
import type { Card } from "./srs.ts";
import { exportJson, importJson, load, save } from "./storage.ts";

const [A, B] = ALL_CASES.map((c) => c.id);
const NOW = 1_800_000_000_000;
const KEY = "cfop-trainer-v1";
const UNREADABLE = "cfop-trainer-v1:unreadable";

const card = (over: Partial<Card> = {}): Card => ({
  ease: 2.5,
  interval: 6,
  reps: 2,
  due: NOW,
  seen: 4,
  known: 3,
  lastGrade: 1,
  ...over,
});

const progress = (over: Partial<Progress> = {}): Progress => ({
  ...defaultProgress(ALL_CASES),
  ...over,
});

// Tests my logic against a Map. It cannot say how a real browser behaves at
// quota or in private mode.
function stubStorage(seed: Record<string, string> = {}, failWrites = false) {
  const data = new Map(Object.entries(seed));
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (failWrites) throw new DOMException("full", "QuotaExceededError");
      data.set(k, v);
    },
  });
  return data;
}

afterEach(() => vi.unstubAllGlobals());

describe("load", () => {
  it("starts from defaults when nothing is stored", () => {
    stubStorage();
    expect(load(ALL_CASES)).toEqual({ progress: defaultProgress(ALL_CASES), problem: null });
  });

  it("reads back what save wrote, under the single key", () => {
    const data = stubStorage();
    const saved = progress({ cards: { [A]: card() }, notes: { [B]: "hook" } });
    expect(save(saved, NOW)).toBe(true);
    expect([...data.keys()]).toEqual([KEY]);
    expect(load(ALL_CASES)).toEqual({ progress: saved, problem: null });
  });

  it("stamps updatedAt from the clock it is given", () => {
    const data = stubStorage();
    save(progress(), NOW);
    const result = parseProgress(data.get(KEY) ?? "", ALL_CASES);
    expect(result.ok && result.updatedAt).toBe(NOW);
  });

  it.each([
    ["corrupt JSON", "{not json"],
    ["a blob from a newer version", JSON.stringify({ ...JSON.parse(serialize(progress(), NOW)), version: 2 })],
  ])("sets aside %s and starts fresh", (_name, raw) => {
    const data = stubStorage({ [KEY]: raw });
    expect(load(ALL_CASES)).toEqual({ progress: defaultProgress(ALL_CASES), problem: "unreadable" });
    expect(data.get(UNREADABLE)).toBe(raw);
  });

  it("keeps the set-aside copy when the first grade overwrites the live blob", () => {
    const data = stubStorage({ [KEY]: "{not json" });
    load(ALL_CASES);
    save(progress({ notes: { [A]: "new" } }), NOW);
    expect(data.get(UNREADABLE)).toBe("{not json");
    expect(load(ALL_CASES).problem).toBeNull();
  });

  it("reports unavailable storage when reading throws", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
    });
    expect(load(ALL_CASES)).toEqual({ progress: defaultProgress(ALL_CASES), problem: "unavailable" });
  });

  it("reports unavailable storage when merely touching the global throws", () => {
    vi.stubGlobal("localStorage", undefined);
    Object.defineProperty(globalThis, "localStorage", {
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
      configurable: true,
    });
    expect(load(ALL_CASES).problem).toBe("unavailable");
  });
});

describe("save", () => {
  it("returns false instead of throwing when the write fails", () => {
    stubStorage({}, true);
    expect(save(progress(), NOW)).toBe(false);
  });
});

describe("exportJson", () => {
  it("names the file for the local date and carries a parseable blob", () => {
    const exported = exportJson(progress({ notes: { [A]: "x" } }), new Date(2026, 8, 20, 12).getTime());
    expect(exported.filename).toBe("cfop-progress-2026-09-20.json");
    const back = parseProgress(exported.text, ALL_CASES);
    expect(back.ok && back.progress.notes).toEqual({ [A]: "x" });
  });
});

describe("importJson", () => {
  const local = progress({ cards: { [A]: card({ seen: 2 }) }, notes: { [A]: "mine" } });
  const file = serialize(
    progress({
      prefs: { showNames: false, showSolutions: true, groups: ["PLL"] },
      cards: { [A]: card({ seen: 9 }), [B]: card() },
      notes: { [A]: "theirs" },
    }),
    NOW,
  );

  it("merges, saves the result, and keeps local prefs", () => {
    const data = stubStorage();
    const result = importJson(file, "merge", local, ALL_CASES, NOW);
    expect(result).toMatchObject({ ok: true, dropped: 0, saved: true });
    if (!result.ok) return;
    expect(result.progress.cards[A].seen).toBe(9);
    expect(Object.keys(result.progress.cards)).toContain(B);
    expect(result.progress.notes[A]).toBe("mine\n\ntheirs");
    expect(result.progress.prefs).toEqual(local.prefs);
    expect(load(ALL_CASES).progress).toEqual(result.progress);
    expect(data.has(KEY)).toBe(true);
  });

  it("replaces everything, prefs included", () => {
    stubStorage();
    const result = importJson(file, "replace", local, ALL_CASES, NOW);
    expect(result.ok && result.progress.prefs.groups).toEqual(["PLL"]);
    expect(result.ok && result.progress.notes).toEqual({ [A]: "theirs" });
  });

  it("reports the unknown ids it dropped", () => {
    stubStorage();
    const withGhost = JSON.stringify({ ...JSON.parse(file), notes: { ghost: "x" } });
    expect(importJson(withGhost, "merge", local, ALL_CASES, NOW)).toMatchObject({ ok: true, dropped: 1 });
  });

  it.each([["not json"], [JSON.stringify({ ...JSON.parse(file), version: 2 })]])(
    "refuses a bad file and writes nothing",
    (text) => {
      const data = stubStorage();
      const result = importJson(text, "replace", local, ALL_CASES, NOW);
      expect(result.ok).toBe(false);
      expect(data.size).toBe(0);
    },
  );

  it("still returns the imported progress when the write fails, flagged unsaved", () => {
    stubStorage({}, true);
    const result = importJson(file, "replace", local, ALL_CASES, NOW);
    expect(result).toMatchObject({ ok: true, saved: false });
  });
});
