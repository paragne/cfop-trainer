import { describe, expect, it } from "vitest";
import { defaultProgress } from "./progress.ts";
import type { Progress } from "./progress.ts";
import { cardView, press, start } from "./screen.ts";
import type { Context } from "./screen.ts";
import { mk, NOW } from "./session.fixture.ts";

const cases = ["a", "b", "c"].map((id) => mk(id));

const ctx = (progress: Progress = defaultProgress()): Context => ({
  progress,
  cases,
  now: NOW,
  random: () => 0.5,
});

const drill = () => start("drill", ctx());

describe("drill", () => {
  it("reveal toggles the solution and records a pace stat, but grades nothing", () => {
    const context = ctx();
    const before = drill();
    const id = cardView(before)?.c.id ?? "";
    const next = press(before, "reveal", context);
    expect(cardView(next.screen)?.revealed).toBe(true);
    expect(next.progress.drillStats[id]).toMatchObject({ attempts: 1 });
    expect(next.progress.cards).toEqual({});
  });

  it("does not record a second attempt toggling the same card's solution off and back on", () => {
    const context = ctx();
    let state = press(drill(), "reveal", context);
    const id = cardView(state.screen)?.c.id ?? "";
    state = press(state.screen, "reveal", { ...context, progress: state.progress });
    state = press(state.screen, "reveal", { ...context, progress: state.progress });
    expect(state.progress.drillStats[id]).toMatchObject({ attempts: 1 });
  });

  it("does not time a card that starts already revealed (auto-reveal on)", () => {
    const base = defaultProgress();
    const auto: Progress = { ...base, prefs: { ...base.prefs, showSolutions: true, mode: "drill" } };
    const screen = start("drill", ctx(auto));
    const next = press(screen, "reveal", ctx(auto));
    expect(next.progress.drillStats).toEqual({});
  });

  it("next moves to a different case, and nothing is graded", () => {
    const context = ctx();
    const before = drill();
    const next = press(before, "next", context);
    expect(cardView(next.screen)?.c.id).not.toBe(cardView(before)?.c.id);
    expect(cardView(next.screen)?.count).toBe("2");
    expect(next.progress).toBe(context.progress);
  });

  it("know also moves to a different case, since numpad . is the one confirm key across every mode", () => {
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
