import { describe, expect, it } from "vitest";
import { defaultProgress } from "./progress.ts";
import type { Progress } from "./progress.ts";
import { cardView, press, start } from "./screen.ts";
import type { Action, Context } from "./screen.ts";
import { mk, NOW } from "./session.fixture.ts";

describe("random AUF on the card screens", () => {
  const ollCases = ["a", "b", "c"].map((id) => mk(id, ["Full OLL"]));
  const f2lCases = ["a", "b", "c"].map((id) => mk(id));
  const rotated = (mode: "learn" | "drill", sets: Progress["prefs"]["sets"]): Progress => {
    const base = defaultProgress();
    return { ...base, prefs: { ...base.prefs, mode, randomRotation: true, sets } };
  };
  const sets = (learn: Progress["prefs"]["sets"]["learn"]) => ({ ...defaultProgress().prefs.sets, learn, drill: learn });
  const withRandom = (random: () => number, progress: Progress, pool = ollCases): Context => ({
    progress,
    cases: pool,
    now: NOW,
    random,
  });
  const never = () => {
    throw new Error("random was called");
  };

  it("is drawn for an OLL card when on", () => {
    const progress = rotated("learn", sets(["Full OLL"]));
    expect(cardView(start("learn", withRandom(() => 0.5, progress)))?.auf).toBe("U'");
    expect(cardView(start("drill", withRandom(() => 0.75, progress)))?.auf).toBe("U2");
  });

  // 0.5 would draw U' for an OLL card, so an F2L card reading "" is the exemption.
  it("is never drawn for F2L, even when on", () => {
    const progress = rotated("learn", sets(["F2L"]));
    expect(cardView(start("learn", withRandom(() => 0.5, progress, f2lCases)))?.auf).toBe("");
  });

  it("is not drawn when off, on any transition", () => {
    const base = defaultProgress();
    const off = { ...base, prefs: { ...base.prefs, sets: sets(["Full OLL"]) } };
    const context = { ...withRandom(() => 0.5, off), progress: off };
    for (const mode of ["learn", "drill"] as const) {
      const screen = start(mode, context);
      expect(cardView(screen)?.auf).toBe("");
      const quiet = { ...context, random: never };
      expect(cardView(press(screen, "know", quiet).screen)?.auf).toBe("");
    }
  });

  it("is redrawn for a failed card that comes straight back", () => {
    const progress = rotated("learn", sets(["Full OLL"]));
    const only = [ollCases[0]];
    const first = start("learn", withRandom(() => 0.5, progress, only));
    const again = press(first, "dontKnow", withRandom(() => 0.75, progress, only)).screen;
    expect(cardView(first)?.c.id).toBe(cardView(again)?.c.id);
    expect([cardView(first)?.auf, cardView(again)?.auf]).toEqual(["U'", "U2"]);
  });

  it("is redrawn on Next in Drill", () => {
    const progress = rotated("drill", sets(["Full OLL"]));
    const first = start("drill", withRandom(() => 0.5, progress));
    const next = press(first, "next", withRandom(() => 0.25, progress)).screen;
    expect(cardView(next)?.auf).toBe("U");
  });

  it.each<Action>(["reveal", "toggleNames"])("survives %s on the same card", (action) => {
    const progress = rotated("learn", sets(["Full OLL"]));
    const first = start("learn", withRandom(() => 0.5, progress));
    const after = press(first, action, withRandom(never, progress)).screen;
    expect(cardView(after)?.auf).toBe("U'");
  });
});
