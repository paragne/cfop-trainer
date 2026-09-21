import { describe, expect, it } from "vitest";
import type { CaseSet } from "../data/algorithms.ts";
import { defaultProgress } from "./progress.ts";
import type { Progress } from "./progress.ts";
import { startSession } from "./session.ts";
import { card, DAY, ids, mk, NOW } from "./session.fixture.ts";

describe("startSession", () => {
  const cases = [mk("f1"), mk("f2"), mk("f3"), mk("o1", ["2-Look OLL"]), mk("p1", ["2-Look PLL"])];
  const all = (over: Partial<Progress> = {}): Progress => ({ ...defaultProgress(), ...over });

  const learning = (learn: CaseSet[]): Progress => {
    const base = defaultProgress();
    return all({ prefs: { ...base.prefs, sets: { ...base.prefs.sets, learn } } });
  };

  it("queues only the cases in the selected learn sets", () => {
    const p = learning(["2-Look OLL", "2-Look PLL"]);
    expect(ids(startSession(cases, p, NOW, () => 0.5)).sort()).toEqual(["o1", "p1"]);
  });

  it("queues a case once when it belongs to two selected sets", () => {
    const both = [mk("shared", ["2-Look OLL", "Full OLL"]), mk("only-full", ["Full OLL"])];
    const p = learning(["2-Look OLL", "Full OLL"]);
    expect(ids(startSession(both, p, NOW, () => 0.5)).sort()).toEqual(["only-full", "shared"]);
  });

  it("ignores the sets chosen for the other modes", () => {
    const base = defaultProgress();
    const p = all({ prefs: { ...base.prefs, sets: { learn: ["F2L"], drill: ["Full PLL"], verify: ["Full OLL"] } } });
    expect(ids(startSession(cases, p, NOW, () => 0.5)).sort()).toEqual(["f1", "f2", "f3"]);
  });

  it.each([true, false])("starts revealed from the auto-reveal pref (%s)", (show) => {
    const base = defaultProgress();
    const p = all({ prefs: { ...base.prefs, showSolutions: show } });
    expect(startSession(cases, p, NOW, () => 0.5).revealed).toBe(show);
  });

  it("counts the unique cases as total, with nothing done", () => {
    const s = startSession(cases, all(), NOW, () => 0.5);
    expect(s).toMatchObject({ total: 5, done: 0, index: 0, firstTry: 0 });
  });

  it("puts never-seen cases before graded ones that are not yet due", () => {
    const cards = { f1: card({ due: NOW + DAY, seen: 5, known: 1 }), f2: card({ due: NOW + DAY, seen: 2, known: 1 }) };
    const s = startSession(cases, all({ cards }), NOW, () => 0.5);
    expect(ids(s).slice(3)).toEqual(["f1", "f2"]);
  });
});
