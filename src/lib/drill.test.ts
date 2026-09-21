import { describe, expect, it } from "vitest";
import type { CaseSet } from "../data/algorithms.ts";
import { nextCase, startDrill } from "./drill.ts";
import { defaultProgress } from "./progress.ts";
import type { Progress } from "./progress.ts";
import { mk } from "./session.fixture.ts";
import { toggleReveal } from "./session.ts";

const progress = (drill: CaseSet[], showSolutions = false): Progress => {
  const base = defaultProgress();
  return {
    ...base,
    prefs: { ...base.prefs, showSolutions, sets: { ...base.prefs.sets, drill } },
  };
};

// A random source that replays these values, then repeats the last one.
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};

// Mulberry32, so long runs are reproducible.
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const cases = (n: number) => Array.from({ length: n }, (_, i) => mk(`c${i}`));

describe("startDrill", () => {
  it("draws only from the Drill selection, not the Learn one", () => {
    const pool = [mk("f", ["F2L"]), mk("p1", ["Full PLL"]), mk("p2", ["Full PLL"])];
    const d = startDrill(pool, progress(["Full PLL"]), Math.random);
    expect(d.pool.map((c) => c.id)).toEqual(["p1", "p2"]);
    expect([d.current, ...d.bag].map((c) => c.id).toSorted()).toEqual(["p1", "p2"]);
  });

  it("starts at one card shown", () => {
    expect(startDrill(cases(3), progress(["F2L"]), Math.random).shown).toBe(1);
  });

  it("throws when the selection has fewer than two cases", () => {
    expect(() => startDrill(cases(1), progress(["F2L"]), Math.random)).toThrow(/two/);
    expect(() => startDrill([], progress(["F2L"]), Math.random)).toThrow(/two/);
  });

  it("starts revealed only when auto-reveal is on", () => {
    expect(startDrill(cases(3), progress(["F2L"], true), Math.random).revealed).toBe(true);
    expect(startDrill(cases(3), progress(["F2L"], false), Math.random).revealed).toBe(false);
  });
});

describe("nextCase", () => {
  it.each([2, 3, 5, 12])("never repeats the last case, with a pool of %i", (size) => {
    const random = seeded(size);
    const p = progress(["F2L"]);
    let d = startDrill(cases(size), p, random);
    for (let i = 0; i < 500; i++) {
      const next = nextCase(d, p, random);
      expect(next.current.id).not.toBe(d.current.id);
      d = next;
    }
  });

  it("shows every case once before any case comes back", () => {
    const random = seeded(7);
    const p = progress(["F2L"]);
    let d = startDrill(cases(6), p, random);
    for (let pass = 0; pass < 4; pass++) {
      const seen = [d.current.id];
      for (let i = 1; i < 6; i++) {
        d = nextCase(d, p, random);
        seen.push(d.current.id);
      }
      expect(seen.toSorted()).toEqual(["c0", "c1", "c2", "c3", "c4", "c5"]);
      d = nextCase(d, p, random);
    }
  });

  it("moves a new pass's opening case off the one just shown", () => {
    // The first shuffle's two swaps give [b, c, a]; the reshuffle is then
    // the identity, whose first case is a, the case just shown.
    const p = progress(["F2L"]);
    const pool = [mk("a"), mk("b"), mk("c")];
    const random = seq(0, 0, 0.999);
    let d = startDrill(pool, p, random);
    expect(d.current.id).toBe("b");
    d = nextCase(d, p, random);
    d = nextCase(d, p, random);
    expect(d.current.id).toBe("a");
    expect(nextCase(d, p, random).current.id).toBe("b");
  });

  it("counts every card shown", () => {
    const p = progress(["F2L"]);
    let d = startDrill(cases(3), p, Math.random);
    for (let i = 0; i < 7; i++) d = nextCase(d, p, Math.random);
    expect(d.shown).toBe(8);
  });

  it("hides a revealed solution on the next card unless auto-reveal is on", () => {
    const off = progress(["F2L"], false);
    const shown = toggleReveal(startDrill(cases(3), off, Math.random));
    expect(shown.revealed).toBe(true);
    expect(nextCase(shown, off, Math.random).revealed).toBe(false);

    const on = progress(["F2L"], true);
    const hidden = toggleReveal(startDrill(cases(3), on, Math.random));
    expect(hidden.revealed).toBe(false);
    expect(nextCase(hidden, on, Math.random).revealed).toBe(true);
  });

  it("keeps the same pool", () => {
    const p = progress(["F2L"]);
    const d = startDrill(cases(4), p, Math.random);
    expect(nextCase(d, p, Math.random).pool).toBe(d.pool);
  });
});
