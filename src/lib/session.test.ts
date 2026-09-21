import { describe, expect, it } from "vitest";
import type { Case, Group } from "../data/algorithms.ts";
import { defaultProgress } from "./progress.ts";
import type { Progress } from "./progress.ts";
import { answer, current, startSession, toggleReveal } from "./session.ts";
import type { Session } from "./session.ts";
import type { Card } from "./srs.ts";

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;

const mk = (id: string, group: Group = "F2L"): Case => ({
  id,
  group,
  section: "",
  name: null,
  aliases: [],
  algs: [{ display: "U", moves: "U" }],
  mask: { kind: "f2l", slot: "FR" },
  setup: null,
  videoUrl: null,
});

const card = (over: Partial<Card> = {}): Card => ({
  ease: 2.5,
  interval: 6,
  reps: 2,
  due: NOW - 1,
  seen: 4,
  known: 3,
  lastGrade: 1,
  ...over,
});

const progress = (cards: Record<string, Card> = {}, show = false): Progress => {
  const base = defaultProgress([mk("x")]);
  return { ...base, prefs: { ...base.prefs, showSolutions: show }, cards };
};

const sessionOf = (ids: string[], over: Partial<Session> = {}): Session => ({
  queue: ids.map((id) => mk(id)),
  index: 0,
  attempts: {},
  done: 0,
  total: ids.length,
  firstTry: 0,
  revealed: false,
  ...over,
});

const ids = (s: Session) => s.queue.map((c) => c.id);

// Plays a list of grades, returning the final session and progress.
function play(s: Session, p: Progress, grades: boolean[]) {
  let state = { session: s, progress: p };
  for (const know of grades) state = answer(state.session, state.progress, know, NOW);
  return state;
}

describe("startSession", () => {
  const cases = [mk("f1"), mk("f2"), mk("f3"), mk("o1", "OLL"), mk("p1", "PLL")];
  const all = (over: Partial<Progress> = {}): Progress => ({ ...defaultProgress(cases), ...over });

  it("queues only the selected groups", () => {
    const base = defaultProgress(cases);
    const groups: Group[] = ["OLL", "PLL"];
    const p = all({ prefs: { ...base.prefs, groups } });
    expect(ids(startSession(cases, p, NOW, () => 0.5)).sort()).toEqual(["o1", "p1"]);
  });

  it.each([true, false])("starts revealed from the auto-reveal pref (%s)", (show) => {
    const base = defaultProgress(cases);
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

describe("toggleReveal", () => {
  it("toggles both ways", () => {
    const shown = toggleReveal(sessionOf(["a"]));
    expect(shown.revealed).toBe(true);
    expect(toggleReveal(shown).revealed).toBe(false);
  });
});

describe("learning step", () => {
  it("brings a failed card back four positions later", () => {
    const { session } = play(sessionOf(["a", "b", "c", "d", "e", "f"]), progress(), [false]);
    expect(ids(session)).toEqual(["a", "b", "c", "d", "a", "e", "f"]);
    expect(session.index).toBe(1);
  });

  it("clamps the retry to the end of a short queue", () => {
    const { session } = play(sessionOf(["a", "b", "c"], { index: 1 }), progress(), [false]);
    expect(ids(session)).toEqual(["a", "b", "c", "b"]);
  });

  it("retries the last card immediately when nothing else remains", () => {
    const { session } = play(sessionOf(["a", "b"], { index: 1 }), progress(), [false]);
    expect(ids(session)).toEqual(["a", "b", "b"]);
    expect(current(session)?.id).toBe("b");
  });

  it("lets a card go after two retries, so it appears exactly three times", () => {
    const { session } = play(sessionOf(["a"]), progress(), [false, false, false]);
    expect(ids(session)).toEqual(["a", "a", "a"]);
    expect(current(session)).toBeNull();
    expect(session).toMatchObject({ done: 1, total: 1, firstTry: 0 });
  });

  it("keeps the denominator fixed and counts done only on completion", () => {
    const failed = play(sessionOf(["a", "b"]), progress(), [false]).session;
    expect(failed).toMatchObject({ done: 0, total: 2 });
    const passed = play(sessionOf(["a", "b"]), progress(), [true, true]).session;
    expect(passed).toMatchObject({ done: 2, total: 2 });
  });
});

describe("which grades schedule", () => {
  it("applies a first failure in full", () => {
    const { progress: p } = play(sessionOf(["a"]), progress(), [false]);
    expect(p.cards.a).toEqual({ ease: 2.3, interval: 1, reps: 0, due: NOW + DAY, seen: 1, known: 0, lastGrade: 0 });
  });

  it("does not lower ease again on later failures", () => {
    const { progress: p } = play(sessionOf(["a"]), progress(), [false, false, false]);
    expect(p.cards.a).toEqual({ ease: 2.3, interval: 1, reps: 0, due: NOW + DAY, seen: 3, known: 0, lastGrade: 0 });
  });

  it("keeps the first failure's schedule when a retry succeeds", () => {
    const { progress: p, session } = play(sessionOf(["a"]), progress(), [false, true]);
    expect(p.cards.a).toEqual({ ease: 2.3, interval: 1, reps: 0, due: NOW + DAY, seen: 2, known: 1, lastGrade: 1 });
    expect(session).toMatchObject({ done: 1, firstTry: 0 });
  });

  it("keeps the schedule when a retry succeeds after the day has rolled over", () => {
    // The first failure's due date has passed, so the card looks due again.
    const failed = answer(sessionOf(["a"]), progress(), false, NOW);
    const retried = answer(failed.session, failed.progress, true, NOW + 2 * DAY);
    expect(retried.progress.cards.a).toEqual({ ...failed.progress.cards.a, seen: 2, known: 1, lastGrade: 1 });
  });

  it("advances a never-seen card fully on a first success", () => {
    const { progress: p, session } = play(sessionOf(["a"]), progress(), [true]);
    expect(p.cards.a).toMatchObject({ ease: 2.55, interval: 1, reps: 1, seen: 1, known: 1 });
    expect(session.firstTry).toBe(1);
  });

  it("advances a due card fully on a first success", () => {
    const { progress: p } = play(sessionOf(["a"]), progress({ a: card() }), [true]);
    expect(p.cards.a).toMatchObject({ ease: 2.55, interval: 15, reps: 3, due: NOW + 15 * DAY });
  });

  it("changes only the counters on a first success for a card not yet due", () => {
    const prev = card({ due: NOW + 3 * DAY, lastGrade: 0 });
    const { progress: p } = play(sessionOf(["a"]), progress({ a: prev }), [true]);
    expect(p.cards.a).toEqual({ ...prev, seen: 5, known: 4, lastGrade: 1 });
  });

  it("still applies a first failure in full to a card not yet due", () => {
    const prev = card({ due: NOW + 3 * DAY });
    const { progress: p } = play(sessionOf(["a"]), progress({ a: prev }), [false]);
    expect(p.cards.a).toMatchObject({ ease: 2.3, interval: 1, reps: 0, due: NOW + DAY, seen: 5, known: 3 });
  });
});

describe("answer", () => {
  it("resets reveal to the auto-reveal pref for the next card", () => {
    const shown = sessionOf(["a", "b"], { revealed: true });
    expect(answer(shown, progress({}, false), true, NOW).session.revealed).toBe(false);
    expect(answer(sessionOf(["a", "b"]), progress({}, true), true, NOW).session.revealed).toBe(true);
  });

  it("leaves prefs and notes untouched and its inputs unmodified", () => {
    const p = progress({ a: card() });
    const frozen = Object.freeze({ ...p, cards: Object.freeze(p.cards) });
    const s = Object.freeze(sessionOf(["a", "b"], { attempts: Object.freeze({}) }));
    const result = answer(s, frozen, false, NOW);
    expect(result.progress.prefs).toBe(p.prefs);
    expect(result.progress.notes).toBe(p.notes);
  });

  it("throws when the session is finished", () => {
    expect(() => answer(sessionOf(["a"], { index: 1 }), progress(), true, NOW)).toThrow();
  });
});
