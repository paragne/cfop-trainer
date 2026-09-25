import { describe, expect, it } from "vitest";
import { ALL_CASES } from "../data/algorithms.ts";
import { defaultProgress, mergeProgress } from "./progress.ts";
import type { Progress } from "./progress.ts";
import type { Card } from "./srs.ts";

const [A, B, C] = ALL_CASES.map((c) => c.id);
const NOW = 1_800_000_000_000;

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
  ...defaultProgress(),
  ...over,
});

describe("mergeProgress", () => {
  const withCards = (cards: Record<string, Card>) => progress({ cards });

  it("keeps the longer history for a card, whichever side it is on", () => {
    const short = withCards({ [A]: card({ seen: 3, ease: 2.1 }) });
    const long = withCards({ [A]: card({ seen: 5, ease: 2.9 }) });
    expect(mergeProgress(short, long).cards[A].seen).toBe(5);
    expect(mergeProgress(long, short).cards[A].seen).toBe(5);
  });

  it("breaks a seen tie with the later due, whichever side it is on", () => {
    const early = withCards({ [A]: card({ due: NOW }) });
    const late = withCards({ [A]: card({ due: NOW + 1 }) });
    expect(mergeProgress(early, late).cards[A].due).toBe(NOW + 1);
    expect(mergeProgress(late, early).cards[A].due).toBe(NOW + 1);
  });

  it("keeps cards found on only one side", () => {
    const merged = mergeProgress(withCards({ [A]: card() }), withCards({ [B]: card() }));
    expect(Object.keys(merged.cards).sort()).toEqual([A, B].sort());
  });

  it("is idempotent", () => {
    const local = progress({ cards: { [A]: card() }, notes: { [A]: "x", [B]: "y" } });
    const imported = progress({ cards: { [A]: card({ seen: 9 }), [C]: card() }, notes: { [A]: "z" } });
    const once = mergeProgress(local, imported);
    expect(mergeProgress(local, local)).toEqual(local);
    expect(mergeProgress(once, imported)).toEqual(once);
  });

  it("keeps local prefs", () => {
    const prefs = defaultProgress().prefs;
    const local = progress({ prefs: { ...prefs, showNames: false, sets: { ...prefs.sets, learn: ["Full PLL"] } } });
    const imported = progress({ prefs: { ...prefs, showSolutions: true, sets: { ...prefs.sets, learn: ["F2L"] } } });
    expect(mergeProgress(local, imported).prefs).toEqual(local.prefs);
  });

  it.each([
    ["equal", "same", "same", "same"],
    ["local contains imported", "abc", "b", "abc"],
    ["imported contains local", "b", "abc", "abc"],
    ["conflicting", "mine", "theirs", "mine\n\ntheirs"],
  ])("merges %s notes without losing text", (_name, local, imported, expected) => {
    const merged = mergeProgress(progress({ notes: { [A]: local } }), progress({ notes: { [A]: imported } }));
    expect(merged.notes[A]).toBe(expected);
  });

  it("adds a note that exists on only one side", () => {
    const merged = mergeProgress(progress({ notes: { [A]: "a" } }), progress({ notes: { [B]: "b" } }));
    expect(merged.notes).toEqual({ [A]: "a", [B]: "b" });
  });

  it("keeps the local star on a conflict and adds one found only on the other side", () => {
    const merged = mergeProgress(progress({ stars: { [A]: 1 } }), progress({ stars: { [A]: 2, [B]: 1 } }));
    expect(merged.stars).toEqual({ [A]: 1, [B]: 1 });
  });

  it("leaves its inputs alone", () => {
    const local = Object.freeze(progress({ cards: Object.freeze({ [A]: card() }), notes: Object.freeze({ [A]: "x" }) }));
    const imported = Object.freeze(progress({ cards: Object.freeze({ [A]: card({ seen: 9 }) }), notes: Object.freeze({ [A]: "y" }) }));
    expect(() => mergeProgress(local, imported)).not.toThrow();
  });
});
