export type Card = {
  ease: number;
  interval: number;
  reps: number;
  due: number;
  seen: number;
  known: number;
  lastGrade: 0 | 1;
};

const DAY_MS = 86_400_000;
const EASE_START = 2.5;
const EASE_FLOOR = 1.3;
const EASE_CAP = 3.0;
const EASE_STEP_UP = 0.05;
const EASE_STEP_DOWN = 0.2;

// Keeps stored ease at 2.55, not 2.5500000000000003.
const round2 = (n: number) => Math.round(n * 100) / 100;

const UNSEEN: Card = {
  ease: EASE_START,
  interval: 0,
  reps: 0,
  due: 0,
  seen: 0,
  known: 0,
  lastGrade: 0,
};

// SM-2 sources disagree on whether the interval uses the ease from before or
// after this grade's update. Before keeps the interval a function of past
// grades only.
export function grade(prev: Card | null, know: boolean, now: number): Card {
  const base = prev ?? UNSEEN;
  const reps = know ? base.reps + 1 : 0;
  const interval = !know
    ? 1
    : reps === 1
      ? 1
      : reps === 2
        ? 6
        : Math.round(base.interval * base.ease);
  const ease = know
    ? Math.min(EASE_CAP, round2(base.ease + EASE_STEP_UP))
    : Math.max(EASE_FLOOR, round2(base.ease - EASE_STEP_DOWN));
  return {
    ease,
    interval,
    reps,
    due: now + interval * DAY_MS,
    seen: base.seen + 1,
    known: base.known + (know ? 1 : 0),
    lastGrade: know ? 1 : 0,
  };
}

// The counters move on every attempt so raw accuracy stays honest, while the
// schedule is left as an earlier grade set it.
export function recount(prev: Card, know: boolean): Card {
  return {
    ...prev,
    seen: prev.seen + 1,
    known: prev.known + (know ? 1 : 0),
    lastGrade: know ? 1 : 0,
  };
}
