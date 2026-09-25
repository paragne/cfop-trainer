import { describe, expect, it } from "vitest";
import { ALL_CASES } from "../data/algorithms.ts";
import { prefixed } from "./auf.ts";
import { parse } from "./notation.ts";
import { caseView, playView } from "./play.ts";
import { defaultProgress } from "./progress.ts";
import type { Progress } from "./progress.ts";
import { chooseAlt, press, start, verifyView } from "./screen.ts";
import type { Action, Context, Screen } from "./screen.ts";

const NOW = 1_800_000_000_000;

const progress = (over: Partial<Progress["prefs"]> = {}): Progress => {
  const base = defaultProgress();
  return { ...base, prefs: { ...base.prefs, ...over } };
};

const ctx = (p: Progress): Context => ({ progress: p, cases: ALL_CASES, now: NOW, random: () => 0.5 });

// Threads progress across the given actions, not just the screen: Verify's
// Check now writes a stat that its own following Match reads back, so a
// multi-action chain must see each step's progress, not the caller's snapshot.
const after = (screen: Screen, p: Progress, ...actions: Action[]): Screen =>
  actions.reduce((s, action) => press(s.screen, action, ctx(s.progress)), { screen, progress: p }).screen;

describe("the gate", () => {
  it("is closed on home", () => {
    expect(playView({ kind: "home" })).toBeNull();
  });

  it.each(["learn", "drill"] as const)("opens in %s only once the solution is revealed", (mode) => {
    const p = progress({ mode });
    const screen = start(mode, ctx(p));
    expect(playView(screen)).toBeNull();
    const revealed = after(screen, p, "reveal");
    expect(playView(revealed)).not.toBeNull();
    expect(playView(after(revealed, p, "reveal"))).toBeNull();
  });

  it("stays closed in Verify through ready and attempt, opens on checked and missed", () => {
    const p = progress({ mode: "verify", sets: { ...defaultProgress().prefs.sets, verify: ["Full OLL"] } });
    let screen = start("verify", ctx(p));
    expect(playView(screen)).toBeNull();
    screen = after(screen, p, "reveal");
    expect(verifyView(screen)?.phase).toBe("attempt");
    expect(playView(screen)).toBeNull();
    screen = after(screen, p, "reveal");
    expect(verifyView(screen)?.phase).toBe("checked");
    expect(playView(screen)).not.toBeNull();
    screen = after(screen, p, "dontKnow");
    expect(verifyView(screen)?.phase).toBe("missed");
    expect(playView(screen)).not.toBeNull();
    screen = after(screen, p, "reveal"); // Reset: step 2, attempt
    for (let step = 2; step <= 30; step++) screen = after(screen, p, "reveal", "know");
    expect(verifyView(screen)?.phase).toBe("attempt");
    expect(playView(screen)).toBeNull();
  });
});

describe("the case picture", () => {
  it("is null on home", () => {
    expect(caseView({ kind: "home" })).toBeNull();
  });

  it.each(["learn", "drill"] as const)("shows in %s before the solution is revealed, with no moves to leak", (mode) => {
    const p = progress({ mode });
    const screen = start(mode, ctx(p));
    expect(playView(screen)).toBeNull();
    expect(caseView(screen)).not.toBeNull();
    expect(Object.keys(caseView(screen) ?? {})).toEqual(["key", "c", "auf"]);
  });

  it("shows in Verify from the attempt on, not while ready", () => {
    const p = progress({ mode: "verify", sets: { ...defaultProgress().prefs.sets, verify: ["Full OLL"] } });
    let screen = start("verify", ctx(p));
    expect(caseView(screen)).toBeNull();
    screen = after(screen, p, "reveal");
    expect(caseView(screen)).not.toBeNull();
    screen = after(screen, p, "reveal");
    expect(caseView(screen)?.key).toBe(playView(screen)?.key);
  });
});

describe("what the view carries", () => {
  it("prefixes the random AUF to the solution, merged the way the shown alg is", () => {
    const p = progress({ randomRotation: true, sets: { ...defaultProgress().prefs.sets, learn: ["Full OLL"] } });
    const screen = after(start("learn", ctx(p)), p, "reveal");
    const view = playView(screen);
    if (view === null) throw new Error("revealed card has no play view");
    expect(view.auf).toBe("U'");
    expect(view.moves).toEqual(parse(prefixed(view.auf, view.c.algs[0].moves)));
  });

  it("plays the starred alg in Learn, the primary without one, and the primary when the star is stale", () => {
    const pair = ALL_CASES.filter((c) => c.id === "oll-24" || c.id === "oll-25");
    const p = progress({ sets: { ...defaultProgress().prefs.sets, learn: ["Full OLL"] } });
    const screen = after(start("learn", { ...ctx(p), cases: pair }), p, "reveal");
    const id = playView(screen)?.c.id;
    if (id === undefined) throw new Error("revealed card has no play view");
    expect(playView(screen)?.alg).toBe(0);
    expect(playView(screen, { [id]: 1 })?.alg).toBe(1);
    expect(playView(screen, { [id]: 2 })?.alg).toBe(0);
  });

  it("follows the alg chosen in Verify, keeping the card's key", () => {
    const pair = ALL_CASES.filter((c) => c.id === "oll-24" || c.id === "oll-25");
    const p = progress({ mode: "verify", sets: { ...defaultProgress().prefs.sets, verify: ["Full OLL"] } });
    let screen = start("verify", { ...ctx(p), cases: pair });
    screen = after(screen, p, "reveal", "reveal");
    const first = playView(screen);
    const second = playView(chooseAlt(screen, 1));
    if (first === null || second === null) throw new Error("checked verify has no play view");
    expect(second.moves).toEqual(parse(prefixed(second.auf, second.c.algs[1].moves)));
    expect(second.alg).toBe(1);
    expect(second.key).toBe(first.key);
  });
});
