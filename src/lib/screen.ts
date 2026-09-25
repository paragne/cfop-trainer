import type { Case } from "../data/algorithms.ts";
import { pickAuf } from "./auf.ts";
import type { Auf } from "./auf.ts";
import { nextCase, startDrill } from "./drill.ts";
import type { Drill } from "./drill.ts";
import type { Mode } from "./prefs.ts";
import type { Progress } from "./progress.ts";
import { recordDrillTime, recordVerifyMatch, recordVerifyTime, setPref } from "./progress-edit.ts";
import { answer, current, startSession, toggleReveal } from "./session.ts";
import type { Session } from "./session.ts";
import { begin, check, choose as chooseAlg, judge, reset, startVerify } from "./verify.ts";
import type { Verify } from "./verify.ts";

// Verify has its own instruction phase built into its state (see Phase
// "ready" below), so the shared intro screen only ever fronts Learn and Drill.
export type IntroMode = "learn" | "drill";

export type Screen =
  | { kind: "home" }
  | { kind: "intro"; mode: IntroMode }
  | { kind: "learn"; session: Session; auf: Auf }
  // startedAt marks when the current card was shown, for Drill's pace stat.
  // timedThisCard is true once that card's first reveal has been recorded, so
  // toggling the solution back off and on again does not record it twice.
  | { kind: "drill"; drill: Drill; auf: Auf; startedAt: number; timedThisCard: boolean }
  // startedAt marks when the current attempt began, for Verify's time stat.
  | { kind: "verify"; verify: Verify; startedAt: number };

export type Action = "reveal" | "dontKnow" | "know" | "next" | "toggleNames";

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
    return { kind: "drill", drill, auf: aufFor(drill.current, ctx), startedAt: now, timedThisCard: false };
  }
  return { kind: "verify", verify: startVerify(cases, progress, random), startedAt: now };
}

// In Drill, "next" moves on, and so does "know": numpad . is the one
// "correct/confirm" key across every mode, and Drill's confirm is Next.
// "dontKnow" stays unbound there, since nothing is graded.
export function press(
  screen: Screen,
  action: Action,
  ctx: Context,
): { screen: Screen; progress: Progress } {
  const { progress, random } = ctx;
  const unchanged = { screen, progress };
  if (screen.kind === "home") {
    const mode = progress.prefs.mode;
    const startable = progress.prefs.sets[mode].length > 0;
    if (action !== "reveal" || !startable) return unchanged;
    if (mode === "verify") {
      const verify = startVerify(ctx.cases, progress, random);
      // "Don't show this again" skips straight past Verify's own ready phase.
      const skipped = progress.prefs.skipVerifyIntro;
      return { screen: { kind: "verify", verify: skipped ? begin(verify) : verify, startedAt: ctx.now }, progress };
    }
    const skip = mode === "learn" ? progress.prefs.skipLearnIntro : progress.prefs.skipDrillIntro;
    return { screen: skip ? start(mode, ctx) : { kind: "intro", mode }, progress };
  }
  if (action === "toggleNames") {
    return { screen, progress: setPref(progress, "showNames", !progress.prefs.showNames) };
  }
  if (screen.kind === "intro") {
    return action === "reveal" ? { screen: start(screen.mode, ctx), progress } : unchanged;
  }
  if (screen.kind === "verify") {
    const { verify, startedAt, progress: next } = pressVerify(screen.verify, screen.startedAt, action, ctx);
    return verify === screen.verify && startedAt === screen.startedAt && next === progress
      ? unchanged
      : { screen: { kind: "verify", verify, startedAt }, progress: next };
  }
  if (screen.kind === "drill") {
    if (action === "reveal") {
      // Only the transition into view is timed, and only when the card did
      // not start pre-revealed (auto-reveal on): there is no honest interval
      // to measure once the solution shows the moment the case does.
      const timing = !screen.drill.revealed && !screen.timedThisCard && !progress.prefs.showSolutions;
      const nextProgress = timing ? recordDrillTime(progress, screen.drill.current.id, ctx.now - screen.startedAt) : progress;
      return {
        screen: { ...screen, drill: toggleReveal(screen.drill), timedThisCard: timing || screen.timedThisCard },
        progress: nextProgress,
      };
    }
    if (action !== "next" && action !== "know") return unchanged;
    const drill = nextCase(screen.drill, progress, random);
    return {
      screen: { kind: "drill", drill, auf: aufFor(drill.current, ctx), startedAt: ctx.now, timedThisCard: false },
      progress,
    };
  }
  if (current(screen.session) === null) {
    return action === "reveal" ? { screen: start("learn", ctx), progress } : unchanged;
  }
  if (action === "reveal") {
    return { screen: { ...screen, session: toggleReveal(screen.session) }, progress };
  }
  if (action === "next") return unchanged;
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

// Non-null only on a finished session's summary. Drill and Verify never end.
export function resultText(screen: Screen): string | null {
  if (screen.kind !== "learn" || current(screen.session) !== null) return null;
  const { firstTry, total } = screen.session;
  return `${firstTry} of ${total} known on the first try.`;
}

// Verify has no card to show and drives its own screen instead of flashcard's.
export function verifyView(screen: Screen): Verify | null {
  return screen.kind === "verify" ? screen.verify : null;
}

// The instruction page shown once, between Home's Start button and the first
// case, for whichever mode was chosen.
export function introMode(screen: Screen): IntroMode | null {
  return screen.kind === "intro" ? screen.mode : null;
}

// Picks which of a case's algs was executed, when they disagree on where the
// case lands (see verify.ts's choices()). Not an action: chosen by clicking
// one of the alternates, not by a key.
export function chooseAlt(screen: Screen, i: number): Screen {
  if (screen.kind !== "verify") throw new Error("chooseAlt called outside Verify");
  return { kind: "verify", verify: chooseAlg(screen.verify, i), startedAt: screen.startedAt };
}

// Verify reuses the flashcard action names: reveal is the primary action
// (Begin, Check, or Reset), dontKnow is Mismatch and know is Match. Timing
// runs from whenever the current attempt began (startedAt) to Check, which is
// what "attempts" and the time aggregates count; Match separately counts
// "matches" on top of a time already recorded by that Check.
function pressVerify(
  v: Verify,
  startedAt: number,
  action: Action,
  { progress, random, now }: Context,
): { verify: Verify; startedAt: number; progress: Progress } {
  const unchanged = { verify: v, startedAt, progress };
  if (v.phase === "ready") {
    return action === "reveal" ? { verify: begin(v), startedAt: now, progress } : unchanged;
  }
  if (v.phase === "attempt") {
    if (action !== "reveal") return unchanged;
    const withTime = recordVerifyTime(progress, v.current.id, now - startedAt);
    return { verify: check(v), startedAt, progress: withTime };
  }
  if (v.phase === "checked") {
    if (action === "know") {
      return { verify: judge(v, true, progress, random), startedAt: now, progress: recordVerifyMatch(progress, v.current.id) };
    }
    if (action === "dontKnow") return { verify: judge(v, false, progress, random), startedAt, progress };
    return unchanged;
  }
  // "missed": Reset.
  return action === "reveal" ? { verify: reset(v, progress, random), startedAt: now, progress } : unchanged;
}
