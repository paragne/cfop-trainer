import { describe, expect, it } from "vitest";
import { ALL_CASES, CASE_SETS } from "../data/algorithms.ts";
import { dueCount, setStats } from "./stats.ts";
import { card, DAY, mk, NOW } from "./session.fixture.ts";

const stats = (cases: ReturnType<typeof mk>[], cards = {}) =>
  Object.fromEntries(setStats(cases, cards, NOW).map((s) => [s.set, s]));

describe("setStats", () => {
  it("counts every set's cases against the real data", () => {
    expect(setStats(ALL_CASES, {}, NOW).map((s) => [s.set, s.total])).toEqual([
      ["F2L", 41],
      ["2-Look OLL", 10],
      ["2-Look PLL", 6],
      ["Full OLL", 57],
      ["Full PLL", 21],
    ]);
    expect(setStats(ALL_CASES, {}, NOW).map((s) => s.set)).toEqual([...CASE_SETS]);
  });

  it("has no accuracy before a case is graded", () => {
    expect(stats([mk("a")]).F2L).toEqual({
      set: "F2L",
      total: 1,
      seen: 0,
      accuracy: null,
      due: 1,
    });
  });

  it("sums known over seen instead of averaging per-card ratios", () => {
    const cards = {
      a: card({ seen: 1, known: 1 }),
      b: card({ seen: 9, known: 0 }),
    };
    expect(stats([mk("a"), mk("b")], cards).F2L.accuracy).toBeCloseTo(0.1);
  });

  it("counts seen as graded cases, not attempts", () => {
    const cards = { a: card({ seen: 12 }) };
    expect(stats([mk("a"), mk("b")], cards).F2L.seen).toBe(1);
  });

  it("counts a never-seen case and an overdue one as due, and a future one as not", () => {
    const cases = [mk("new"), mk("late"), mk("later")];
    const cards = { late: card({ due: NOW }), later: card({ due: NOW + DAY }) };
    expect(stats(cases, cards).F2L.due).toBe(2);
  });

  it("counts a shared case in both of its sets", () => {
    const shared = mk("shared", ["2-Look OLL", "Full OLL"]);
    const s = stats([shared], { shared: card({ seen: 2, known: 1, due: NOW + DAY }) });
    expect(s["2-Look OLL"]).toMatchObject({ total: 1, seen: 1, accuracy: 0.5, due: 0 });
    expect(s["Full OLL"]).toMatchObject({ total: 1, seen: 1, accuracy: 0.5, due: 0 });
    expect(s.F2L).toMatchObject({ total: 0, seen: 0, accuracy: null, due: 0 });
  });
});

describe("dueCount", () => {
  it("counts a case in two chosen sets once", () => {
    const cases = [mk("shared", ["2-Look OLL", "Full OLL"]), mk("only", ["Full OLL"])];
    expect(dueCount(cases, {}, ["2-Look OLL", "Full OLL"], NOW)).toBe(2);
  });

  it("ignores cases outside the chosen sets", () => {
    expect(dueCount([mk("a", ["F2L"]), mk("b", ["Full PLL"])], {}, ["F2L"], NOW)).toBe(1);
  });

  it("counts every case in the default Learn sets on a fresh install", () => {
    expect(dueCount(ALL_CASES, {}, ["F2L", "2-Look OLL", "2-Look PLL"], NOW)).toBe(57);
  });
});
