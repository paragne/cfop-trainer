import type { Case } from "../data/algorithms.ts";
import { pickAuf } from "./auf.ts";
import type { Auf } from "./auf.ts";
import { nextCase, startDrill } from "./drill.ts";
import type { Drill } from "./drill.ts";
import type { Mode } from "./prefs.ts";
import type { Progress } from "./progress.ts";
import { setPref } from "./progress-edit.ts";
import { answer, current, startSession, toggleReveal } from "./session.ts";
import type { Session } from "./session.ts";

export type Screen =
  | { kind: "home" }
  | { kind: "learn"; session: Session; auf: Auf }
  | { kind: "drill"; drill: Drill; auf: Auf };

export type Action = "reveal" | "dontKnow" | "know" | "toggleNames";

export type Context = {
  progress: Progress;
  cases: readonly Case[];
  now: number;
  random: () => number;
};

// What one card screen shows. Learn and Drill each build it from their own
// state, so the screen knows nothing about either.
export type CardView = {
  c: Case;
  revealed: boolean;
  count: string;
  mode: "learn" | "drill";
  auf: Auf;
};

// Drawn as each card comes up, so a retry is not the same picture twice.
const aufFor = (c: Case | null, { progress, random }: Context): Auf =>
  c === null ? "" : pickAuf(c, progress.prefs.randomRotation, random);

export function start(mode: Mode, ctx: Context): Screen {
  const { progress, cases, now, random } = ctx;
  if (mode === "learn") {
    const session = startSession(cases, progress, now, random);
    return { kind: "learn", session, auf: aufFor(current(session), ctx) };
  }
  if (mode === "drill") {
    const drill = startDrill(cases, progress, random);
    return { kind: "drill", drill, auf: aufFor(drill.current, ctx) };
  }
  throw new Error("Verify has not shipped");
}

// In Drill, "know" is Next and "dontKnow" is not bound.
export function press(
  screen: Screen,
  action: Action,
  ctx: Context,
): { screen: Screen; progress: Progress } {
  const { progress, random } = ctx;
  const unchanged = { screen, progress };
  if (screen.kind === "home") {
    return action === "reveal" ? { screen: start(progress.prefs.mode, ctx), progress } : unchanged;
  }
  if (action === "toggleNames") {
    return { screen, progress: setPref(progress, "showNames", !progress.prefs.showNames) };
  }
  if (screen.kind === "drill") {
    if (action === "dontKnow") return unchanged;
    if (action === "reveal") {
      return { screen: { ...screen, drill: toggleReveal(screen.drill) }, progress };
    }
    const drill = nextCase(screen.drill, progress, random);
    return { screen: { kind: "drill", drill, auf: aufFor(drill.current, ctx) }, progress };
  }
  if (current(screen.session) === null) {
    return action === "reveal" ? { screen: start("learn", ctx), progress } : unchanged;
  }
  if (action === "reveal") {
    return { screen: { ...screen, session: toggleReveal(screen.session) }, progress };
  }
  const result = answer(screen.session, progress, action === "know", ctx.now);
  const auf = aufFor(current(result.session), ctx);
  return { screen: { kind: "learn", session: result.session, auf }, progress: result.progress };
}

export function cardView(screen: Screen): CardView | null {
  if (screen.kind === "drill") {
    const { current: c, revealed, shown } = screen.drill;
    return { c, revealed, count: String(shown), mode: "drill", auf: screen.auf };
  }
  if (screen.kind !== "learn") return null;
  const c = current(screen.session);
  if (c === null) return null;
  const { revealed, done, total } = screen.session;
  return { c, revealed, count: `${done} / ${total}`, mode: "learn", auf: screen.auf };
}

// Non-null only on a finished session's summary.
export function resultText(screen: Screen): string | null {
  if (screen.kind !== "learn" || current(screen.session) !== null) return null;
  const { firstTry, total } = screen.session;
  return `${firstTry} of ${total} known on the first try.`;
}
