import { describe, expect, it } from "vitest";
import { defaultProgress } from "./progress.ts";
import type { Progress } from "./progress.ts";
import { cardView, press, resultText, start } from "./screen.ts";
import type { Action, Context, Screen } from "./screen.ts";
import { mk, NOW } from "./session.fixture.ts";

const cases = ["a", "b", "c"].map((id) => mk(id));

const inMode = (mode: "learn" | "drill"): Progress => {
  const base = defaultProgress();
  return { ...base, prefs: { ...base.prefs, mode } };
};

const ctx = (progress: Progress = defaultProgress()): Context => ({
  progress,
  cases,
  now: NOW,
  random: () => 0.5,
});

const learn = (): Screen => start("learn", ctx());
const drill = (): Screen => start("drill", ctx());

describe("home", () => {
  const home: Screen = { kind: "home" };

  it.each<[string, "learn" | "drill"]>([
    ["a learn session", "learn"],
    ["a drill", "drill"],
  ])("starts %s from the mode last used", (_, mode) => {
    const next = press(home, "reveal", ctx(inMode(mode)));
    expect(next.screen.kind).toBe(mode);
  });

  it("does not start a mode with no sets selected", () => {
    const base = defaultProgress();
    const none = { ...base, prefs: { ...base.prefs, sets: { ...base.prefs.sets, learn: [] } } };
    const context = ctx(none);
    const next = press(home, "reveal", context);
    expect(next.screen).toBe(home);
    expect(next.progress).toBe(context.progress);
  });

  it.each<Action>(["dontKnow", "know", "toggleNames"])("ignores %s", (action) => {
    const context = ctx();
    const next = press(home, action, context);
    expect(next.screen).toBe(home);
    expect(next.progress).toBe(context.progress);
  });
});

describe("toggleNames", () => {
  it.each([learn(), drill()])("flips the pref on a $kind screen and keeps the screen", (screen) => {
    const context = ctx();
    const next = press(screen, "toggleNames", context);
    expect(next.screen).toBe(screen);
    expect(next.progress.prefs.showNames).toBe(!context.progress.prefs.showNames);
  });
});

describe("drill", () => {
  it("reveal toggles the solution and touches no progress", () => {
    const context = ctx();
    const next = press(drill(), "reveal", context);
    expect(cardView(next.screen)?.revealed).toBe(true);
    expect(next.progress).toBe(context.progress);
  });

  it("next moves to a different case, and nothing is graded", () => {
    const context = ctx();
    const before = drill();
    const next = press(before, "next", context);
    expect(cardView(next.screen)?.c.id).not.toBe(cardView(before)?.c.id);
    expect(cardView(next.screen)?.count).toBe("2");
    expect(next.progress).toBe(context.progress);
  });

  it("know also moves to a different case, since numpad 1 is the one confirm key across every mode", () => {
    const context = ctx();
    const before = drill();
    const next = press(before, "know", context);
    expect(cardView(next.screen)?.c.id).not.toBe(cardView(before)?.c.id);
    expect(next.progress).toBe(context.progress);
  });

  it("does nothing on dontKnow", () => {
    const before = drill();
    expect(press(before, "dontKnow", ctx()).screen).toBe(before);
  });
});

describe("learn", () => {
  it("reveal toggles the solution", () => {
    const next = press(learn(), "reveal", ctx());
    expect(cardView(next.screen)?.revealed).toBe(true);
  });

  it("know grades the card and moves on", () => {
    const before = learn();
    const id = cardView(before)?.c.id ?? "";
    const next = press(before, "know", ctx());
    expect(next.progress.cards[id]?.lastGrade).toBe(1);
    expect(cardView(next.screen)?.count).toBe("1 / 3");
  });

  it("dontKnow grades the card as failed", () => {
    const before = learn();
    const id = cardView(before)?.c.id ?? "";
    const next = press(before, "dontKnow", ctx());
    expect(next.progress.cards[id]?.lastGrade).toBe(0);
  });
});

describe("a finished learn session", () => {
  const finished = (): { screen: Screen; progress: Progress } => {
    let state = { screen: start("learn", { ...ctx(), cases: [cases[0]] }), progress: defaultProgress() };
    state = press(state.screen, "know", ctx(state.progress));
    return state;
  };

  it("shows a summary instead of a card", () => {
    const { screen } = finished();
    expect(cardView(screen)).toBeNull();
    expect(resultText(screen)).toBe("1 of 1 known on the first try.");
  });

  it("starts a new session on reveal", () => {
    const { screen, progress } = finished();
    const next = press(screen, "reveal", ctx(progress));
    expect(next.screen.kind).toBe("learn");
    expect(cardView(next.screen)).not.toBeNull();
  });

  it.each<Action>(["dontKnow", "know"])("ignores %s", (action) => {
    const { screen, progress } = finished();
    expect(press(screen, action, ctx(progress)).screen).toBe(screen);
  });
});

describe("views", () => {
  it("has no card and no summary on home", () => {
    expect(cardView({ kind: "home" })).toBeNull();
    expect(resultText({ kind: "home" })).toBeNull();
  });

  it("has a card and no summary mid-session", () => {
    expect(cardView(learn())?.mode).toBe("learn");
    expect(cardView(drill())?.mode).toBe("drill");
    expect(resultText(learn())).toBeNull();
    expect(resultText(drill())).toBeNull();
  });
});
