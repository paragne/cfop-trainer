import { describe, expect, it } from "vitest";
import type { CaseSet } from "../data/algorithms.ts";
import { SOLVED } from "./cube.ts";
import { defaultProgress } from "./progress.ts";
import type { Progress } from "./progress.ts";
import { chooseAlt, press, resultText, start, verifyView } from "./screen.ts";
import type { Context, Screen } from "./screen.ts";
import { mk, NOW } from "./session.fixture.ts";

const pool = ["a", "b"].map((id) => mk(id, ["Full OLL"] as CaseSet[]));

const progress = (over: Partial<Progress["prefs"]> = {}): Progress => {
  const base = defaultProgress();
  return {
    ...base,
    prefs: { ...base.prefs, mode: "verify", sets: { ...base.prefs.sets, verify: ["Full OLL"] }, ...over },
  };
};

const ctx = (p: Progress = progress()): Context => ({ progress: p, cases: pool, now: NOW, random: () => 0.5 });

const started = (p: Progress = progress()): Screen => start("verify", ctx(p));

describe("start", () => {
  it("opens a verify session ready to begin", () => {
    const screen = started();
    expect(screen.kind).toBe("verify");
    expect(verifyView(screen)?.phase).toBe("ready");
  });
});

describe("press on a verify screen", () => {
  it("reveal walks ready -> attempt -> checked", () => {
    let screen = started();
    screen = press(screen, "reveal", ctx()).screen;
    expect(verifyView(screen)?.phase).toBe("attempt");
    screen = press(screen, "reveal", ctx()).screen;
    expect(verifyView(screen)?.phase).toBe("checked");
  });

  it("ignores know and dontKnow before checked", () => {
    const ready = started();
    expect(press(ready, "know", ctx()).screen).toBe(ready);
    const attempt = press(ready, "reveal", ctx()).screen;
    expect(press(attempt, "dontKnow", ctx()).screen).toBe(attempt);
  });

  it("know (Match) advances to the next step and never touches progress", () => {
    const p = progress();
    let screen = start("verify", ctx(p));
    screen = press(screen, "reveal", ctx(p)).screen; // attempt
    screen = press(screen, "reveal", ctx(p)).screen; // checked
    const before = verifyView(screen);
    const result = press(screen, "know", ctx(p));
    expect(verifyView(result.screen)?.phase).toBe("attempt");
    expect(verifyView(result.screen)?.matches).toBe(1);
    expect(verifyView(result.screen)?.current.id).not.toBe(before?.current.id);
    expect(result.progress).toBe(p);
  });

  it("dontKnow (Mismatch) moves to missed without touching the tally", () => {
    let screen = started();
    screen = press(screen, "reveal", ctx()).screen;
    screen = press(screen, "reveal", ctx()).screen;
    const result = press(screen, "dontKnow", ctx());
    expect(verifyView(result.screen)?.phase).toBe("missed");
    expect(verifyView(result.screen)?.matches).toBe(0);
  });

  it("reveal on missed (Reset) returns the cube to solved and continues", () => {
    let screen = started();
    screen = press(screen, "reveal", ctx()).screen;
    screen = press(screen, "reveal", ctx()).screen;
    screen = press(screen, "dontKnow", ctx()).screen;
    const result = press(screen, "reveal", ctx());
    expect(verifyView(result.screen)?.cube).toEqual(SOLVED);
    expect(verifyView(result.screen)?.phase).toBe("attempt");
  });

  it("never writes a card or a note for progress, across a full session", () => {
    const p = progress();
    let state = { screen: start("verify", ctx(p)), progress: p };
    for (let step = 0; step < 5; step++) {
      state = press(state.screen, "reveal", ctx(state.progress));
      state = press(state.screen, "reveal", ctx(state.progress));
      state = press(state.screen, "know", ctx(state.progress));
    }
    expect(state.progress).toBe(p);
    expect(state.progress.cards).toEqual({});
  });
});

describe("a long session", () => {
  it("never finishes: 30 matches later the verify view is still up, with no summary", () => {
    const p = progress();
    let screen = start("verify", ctx(p));
    for (let step = 0; step < 30; step++) {
      screen = press(screen, "reveal", ctx(p)).screen;
      screen = press(screen, "reveal", ctx(p)).screen;
      screen = press(screen, "know", ctx(p)).screen;
    }
    expect(verifyView(screen)).toMatchObject({ step: 31, matches: 30 });
    expect(resultText(screen)).toBeNull();
  });
});

describe("chooseAlt", () => {
  it("throws outside Verify", () => {
    expect(() => chooseAlt({ kind: "home" }, 1)).toThrow();
  });
});
