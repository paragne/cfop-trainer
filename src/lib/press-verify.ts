import type { Progress } from "./progress.ts";
import { recordVerifyMatch, recordVerifyTime } from "./progress-edit.ts";
import type { Action, Context } from "./screen.ts";
import { begin, check, judge, reset } from "./verify.ts";
import type { Verify } from "./verify.ts";

// Verify reuses the flashcard action names: reveal is the primary action
// (Begin, Check, or Reset), dontKnow is Mismatch and know is Match. Timing
// runs from whenever the current attempt began (startedAt) to Check, which is
// what "attempts" and the time aggregates count; Match separately counts
// "matches" on top of a time already recorded by that Check.
export function pressVerify(
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
