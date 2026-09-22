import { describe, expect, it } from "vitest";
import { ALL_CASES } from "../data/algorithms.ts";
import type { Case } from "../data/algorithms.ts";
import { applyMoves, SOLVED } from "./cube.ts";
import { parse } from "./notation.ts";
import { defaultProgress } from "./progress.ts";
import type { Progress } from "./progress.ts";
import { begin, check, choices, choose, expected, judge, regrip, reset, startVerify } from "./verify.ts";
import type { Verify } from "./verify.ts";

const byId = (id: string): Case => {
  const c = ALL_CASES.find((known) => known.id === id);
  if (c === undefined) throw new Error(`no case ${id}`);
  return c;
};

const progress = (over: Partial<Progress["prefs"]> = {}): Progress => {
  const base = defaultProgress();
  return { ...base, prefs: { ...base.prefs, ...over } };
};

const withVerify = (verify: Progress["prefs"]["sets"]["verify"], over: Partial<Progress["prefs"]> = {}) =>
  progress({ sets: { ...defaultProgress().prefs.sets, verify }, ...over });

// Mulberry32, so a seed is reproducible across many draws.
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe("alternate algs", () => {
  const oll24 = byId("oll-24");
  const oll25 = byId("oll-25");
  const pllUa = byId("pll-ua");
  const sune = byId("oll-27");
  const other = byId("pll-h");
  const mk = (current: Case): Verify => ({
    pool: [current, other],
    bag: [other],
    current,
    cube: SOLVED,
    auf: "",
    chosen: 0,
    phase: "checked",
    step: 1,
    length: 5,
    matches: 0,
  });

  it.each([oll24, oll25])("$id: offers both algs, and choosing the alternate advances by it", (c) => {
    const v = mk(c);
    expect(choices(v)).toEqual([0, 1]);
    const viaPrimary = expected(v);
    const alt = choose(v, 1);
    const viaAlt = expected(alt);
    expect(viaAlt).not.toEqual(viaPrimary);
    const after = judge(alt, true, withVerify(["Full OLL", "2-Look PLL"]), Math.random);
    expect(after.cube).toEqual(applyMoves(viaAlt, parse(regrip(viaAlt).join(" "))));
  });

  it("pll-ua: offers no choice, since its alternate is the identical permutation", () => {
    expect(choices(mk(pllUa))).toEqual([]);
  });

  it("a case with only one alg offers no choice", () => {
    expect(choices(mk(sune))).toEqual([]);
  });

  it("is non-empty exactly where an independent computation finds differing outcomes from solved", () => {
    for (const c of ALL_CASES.filter((x) => x.group !== "F2L")) {
      const outcomes = new Set(c.algs.map((alg) => applyMoves(SOLVED, parse(alg.moves)).join("")));
      expect(choices(mk(c)).length > 0, c.id).toBe(outcomes.size > 1);
    }
  });
});

describe("Match, Mismatch and Reset", () => {
  const pool = [byId("oll-27"), byId("oll-26")];
  const p = withVerify(["Full OLL"], { verifyLength: 5 });

  it("Mismatch does not advance the step or the tally", () => {
    const v = check(begin(startVerify(pool, p, seeded(1))));
    const after = judge(v, false, p, Math.random);
    expect(after.phase).toBe("missed");
    expect(after.step).toBe(v.step);
    expect(after.matches).toBe(0);
  });

  it("Reset returns the cube to solved and continues the session", () => {
    const v = check(begin(startVerify(pool, p, seeded(2))));
    const missed = judge(v, false, p, Math.random);
    const after = reset(missed, p, Math.random);
    expect(after.cube).toEqual(SOLVED);
    expect(after.phase).toBe("attempt");
    expect(after.step).toBe(v.step + 1);
    expect(after.matches).toBe(0);
  });

  it("Match increments the tally and moves to the next step", () => {
    const v = check(begin(startVerify(pool, p, seeded(3))));
    const after = judge(v, true, p, Math.random);
    expect(after.matches).toBe(1);
    expect(after.step).toBe(v.step + 1);
    expect(after.phase).toBe("attempt");
  });

  it("reaches done exactly at the configured length, with a tally of every match", () => {
    let v = begin(startVerify(pool, p, seeded(9)));
    for (let i = 0; i < p.prefs.verifyLength; i++) v = judge(check(v), true, p, seeded(9));
    expect(v.phase).toBe("done");
    expect(v.step).toBe(p.prefs.verifyLength);
    expect(v.matches).toBe(p.prefs.verifyLength);
  });
});

describe("no immediate repeat", () => {
  it("never shows the same case twice in a row across a 20-step session", () => {
    const pool = [byId("oll-27"), byId("oll-26")];
    const p = withVerify(["Full OLL"], { verifyLength: 20 });
    const random = seeded(11);
    let v = begin(startVerify(pool, p, random));
    const seen = [v.current.id];
    for (let i = 0; i < p.prefs.verifyLength - 1; i++) {
      v = judge(check(v), true, p, random);
      seen.push(v.current.id);
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
  });
});
