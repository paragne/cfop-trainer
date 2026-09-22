import { describe, expect, it } from "vitest";
import { ALL_CASES } from "../data/algorithms.ts";
import type { Case } from "../data/algorithms.ts";
import { applyMoves, normalize, SOLVED } from "./cube.ts";
import { parse } from "./notation.ts";
import { defaultProgress } from "./progress.ts";
import type { Progress } from "./progress.ts";
import { begin, check, expected, judge, regrip, startVerify } from "./verify.ts";
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

// verify never offers F2L, so the pools below use only OLL/PLL sets.
const withVerify = (verify: Progress["prefs"]["sets"]["verify"], over: Partial<Progress["prefs"]> = {}) =>
  progress({ sets: { ...defaultProgress().prefs.sets, verify }, ...over });

describe("startVerify", () => {
  it("starts ready, at step 1, tally 0, from a solved cube", () => {
    const v = startVerify(ALL_CASES, withVerify(["Full OLL"]), Math.random);
    expect(v).toMatchObject({ step: 1, phase: "ready", matches: 0, cube: SOLVED, chosen: 0 });
  });

  it("throws when the selection has fewer than two cases", () => {
    const single = [byId("oll-27")];
    expect(() => startVerify(single, withVerify(["Full OLL"]), Math.random)).toThrow(/two/);
  });

  it("draws its pool only from prefs.sets.verify, which never includes F2L", () => {
    const v = startVerify(ALL_CASES, withVerify(["Full OLL"]), Math.random);
    expect(v.pool.length).toBeGreaterThan(0);
    expect(v.pool.every((c) => c.group !== "F2L")).toBe(true);
    expect(v.pool.every((c) => c.sets.includes("Full OLL"))).toBe(true);
  });

  it("takes its session length from the pref", () => {
    const v = startVerify(ALL_CASES, withVerify(["Full OLL"], { verifyLength: 5 }), Math.random);
    expect(v.length).toBe(5);
  });
});

describe("expected", () => {
  const pool = [byId("oll-27"), byId("pll-h")];

  it("applies the current step's algorithm, with its AUF, to the cube before it", () => {
    const v = check(begin(startVerify(pool, withVerify(["Full OLL", "2-Look PLL"]), () => 0.9)));
    const want = applyMoves(applyMoves(v.cube, parse(v.auf)), parse(v.current.algs[0].moves));
    expect(expected(v)).toEqual(want);
  });

  it("carries the previous step's regripped result into the next step", () => {
    const p = withVerify(["Full OLL", "2-Look PLL"]);
    const v1 = startVerify(pool, p, () => 0.9);
    expect(v1.auf).toBe(""); // randomRotation defaults off
    const step1Expected = expected(v1);
    const v2 = judge(v1, true, p, Math.random);
    const rotated = applyMoves(step1Expected, parse(regrip(step1Expected).join(" ")));
    expect(v2.cube).toEqual(rotated);
    expect(v2.cube).not.toEqual(SOLVED);
    const want = applyMoves(applyMoves(v2.cube, parse(v2.auf)), parse(v2.current.algs[0].moves));
    expect(expected(v2)).toEqual(want);
  });
});

describe("regrip", () => {
  it("is empty once centers are home", () => {
    expect(regrip(SOLVED)).toEqual([]);
    expect(regrip(applyMoves(SOLVED, parse("R U R' U'")))).toEqual([]);
  });

  // Confirms the invariant regrip promises for every real case, not just
  // oll-42: whatever it returns, applying it truly restores home centers.
  it.each(ALL_CASES.filter((c) => c.group !== "F2L"))(
    "$id: regripping after algs[0] from solved leaves the centers home",
    (c) => {
      const after = applyMoves(SOLVED, parse(c.algs[0].moves));
      const rotated = applyMoves(after, parse(regrip(after).join(" ")));
      expect(normalize(rotated)).toEqual(rotated);
    },
  );

  it("needs a y for oll-42 and nothing for a case that does not rotate", () => {
    expect(regrip(applyMoves(SOLVED, parse(byId("oll-42").algs[0].moves)))).toEqual(["y"]);
    expect(regrip(applyMoves(SOLVED, parse(byId("oll-27").algs[0].moves)))).toEqual([]);
  });
});

describe("oll-42 leaves a displaced grip", () => {
  const oll42 = byId("oll-42");
  const next = byId("pll-h");
  const mk = (over: Partial<Verify> = {}): Verify => ({
    pool: [oll42, next],
    bag: [next],
    current: oll42,
    cube: SOLVED,
    auf: "",
    chosen: 0,
    phase: "checked",
    step: 1,
    length: 5,
    matches: 0,
    ...over,
  });

  it("rotating by the regrip differs from normalizing: the trap normalize() would fall into", () => {
    const e = expected(mk());
    const rotated = applyMoves(e, parse(regrip(e).join(" ")));
    expect(rotated).not.toEqual(normalize(e));
    expect(normalize(rotated)).toEqual(rotated);
  });

  it("Match applies the rotation, and the next step computes from that green-front grip", () => {
    const v = mk();
    const e = expected(v);
    const rotated = applyMoves(e, parse("y"));
    const after = judge(v, true, withVerify(["Full OLL", "2-Look PLL"]), Math.random);
    expect(after.cube).toEqual(rotated);
    expect(after.current.id).toBe("pll-h");
    const stepAfterExpected = applyMoves(applyMoves(after.cube, parse(after.auf)), parse(after.current.algs[0].moves));
    expect(expected(after)).toEqual(stepAfterExpected);
  });
});
