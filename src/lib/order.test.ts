import { describe, expect, it } from "vitest";
import { ALL_CASES } from "../data/algorithms.ts";
import type { CaseSet } from "../data/algorithms.ts";
import { nextCase, startDrill } from "./drill.ts";
import { defaultProgress } from "./progress.ts";
import type { Progress } from "./progress.ts";
import { inReadingOrder, SET_ORDER } from "./selection.ts";
import { SESSION_LENGTH, startSession } from "./session.ts";
import { startVerify } from "./verify.ts";

const NOW = 1_800_000_000_000;

const progress = (shuffle: boolean, sets: CaseSet[]): Progress => {
  const base = defaultProgress();
  return {
    ...base,
    prefs: { ...base.prefs, shuffle, sets: { learn: sets, drill: sets, verify: sets.filter((s) => !s.includes("F2L")), gallery: sets } },
  };
};

const noRandom = (): number => {
  throw new Error("random was called");
};

// A tiny deterministic generator, so a shuffled order is the same every run.
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const ids = (cases: readonly { id: string }[]) => cases.map((c) => c.id);
const CHOSEN: CaseSet[] = ["Full PLL", "2-Look OLL", "Full OLL", "F2L"];

describe("inReadingOrder", () => {
  it("walks the chosen sets in the home screen's order, whatever order they were chosen in", () => {
    const pool = inReadingOrder(ALL_CASES, CHOSEN);
    const firstOfEach = SET_ORDER.filter((s) => CHOSEN.includes(s)).map((s) => pool.findIndex((c) => c.sets.includes(s)));
    expect(firstOfEach).toEqual([...firstOfEach].sort((a, b) => a - b));
    expect(pool[0].sets).toContain("F2L");
    expect(pool[pool.length - 1].sets).toContain("Full PLL");
  });

  it("lists a case in two chosen sets once, with the earlier set", () => {
    const pool = ids(inReadingOrder(ALL_CASES, ["2-Look OLL", "Full OLL"]));
    expect(new Set(pool).size).toBe(pool.length);
    const shared = ALL_CASES.filter((c) => c.sets.includes("2-Look OLL") && c.sets.includes("Full OLL"));
    expect(shared.length).toBeGreaterThan(0);
    expect(pool.slice(0, ids(ALL_CASES.filter((c) => c.sets.includes("2-Look OLL"))).length).sort()).toEqual(
      ids(ALL_CASES.filter((c) => c.sets.includes("2-Look OLL"))).sort(),
    );
  });
});

describe("with shuffle off", () => {
  const pool = ids(inReadingOrder(ALL_CASES, CHOSEN));

  it("Drill shows the pool in order and starts the next pass at the top, without touching random", () => {
    let d = startDrill(ALL_CASES, progress(false, CHOSEN), noRandom);
    const shown = [d.current.id];
    for (let i = 1; i < pool.length + 3; i++) {
      d = nextCase(d, progress(false, CHOSEN), noRandom);
      shown.push(d.current.id);
    }
    expect(shown).toEqual([...pool, ...pool.slice(0, 3)]);
  });

  it("Verify opens on the first case of the pool and lists the rest in order", () => {
    const p = progress(false, CHOSEN);
    const v = startVerify(ALL_CASES, p, noRandom);
    const verifyPool = ids(inReadingOrder(ALL_CASES, p.prefs.sets.verify));
    expect([v.current.id, ...ids(v.bag)]).toEqual(verifyPool);
  });

  it("Learn queues the first due cases in order", () => {
    const s = startSession(ALL_CASES, progress(false, CHOSEN), NOW, noRandom);
    expect(ids(s.queue)).toEqual(pool.slice(0, SESSION_LENGTH));
  });
});

describe("with shuffle on", () => {
  it("is the default", () => {
    expect(defaultProgress().prefs.shuffle).toBe(true);
  });

  it("a first Learn session, with nothing graded yet, is not the data order", () => {
    const p = progress(true, ["F2L", "2-Look OLL", "2-Look PLL"]);
    const s = startSession(ALL_CASES, p, NOW, seeded(3));
    expect(ids(s.queue)).not.toEqual(ids(inReadingOrder(ALL_CASES, p.prefs.sets.learn)).slice(0, SESSION_LENGTH));
    expect(new Set(ids(s.queue)).size).toBe(SESSION_LENGTH);
  });

  it("Drill and Verify open on a shuffled pool", () => {
    const p = progress(true, ["Full OLL", "Full PLL"]);
    const pool = ids(inReadingOrder(ALL_CASES, ["Full OLL", "Full PLL"]));
    const d = startDrill(ALL_CASES, p, seeded(5));
    expect([d.current.id, ...ids(d.bag)]).not.toEqual(pool);
    expect([d.current.id, ...ids(d.bag)].sort()).toEqual([...pool].sort());
    const v = startVerify(ALL_CASES, p, seeded(5));
    expect([v.current.id, ...ids(v.bag)]).not.toEqual(pool);
  });
});
