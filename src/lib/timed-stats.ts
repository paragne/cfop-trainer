import type { Case } from "../data/algorithms.ts";
import { parse } from "./notation.ts";
import { starredAlg } from "./stars.ts";

// How long a case took to solve, aggregated rather than kept as a full event
// history, so storage stays bounded regardless of how long a case is drilled.
export type TimedStat = {
  attempts: number;
  totalMs: number;
  bestMs: number;
  lastMs: number;
};

export type VerifyStat = TimedStat & { matches: number };

export function recordTime(prev: TimedStat | null, elapsedMs: number): TimedStat {
  return {
    attempts: (prev?.attempts ?? 0) + 1,
    totalMs: (prev?.totalMs ?? 0) + elapsedMs,
    bestMs: prev === null ? elapsedMs : Math.min(prev.bestMs, elapsedMs),
    lastMs: elapsedMs,
  };
}

// A match always follows the Check that started this case's record, so a
// missing record here is a programmer error, not a runtime condition.
export function recordMatch(prev: VerifyStat | undefined): VerifyStat {
  if (prev === undefined) throw new Error("match recorded with no prior verify attempt");
  return { ...prev, matches: prev.matches + 1 };
}

// Of the alg the user actually runs: the starred one, else the primary.
const moveCount = (c: Case, stars: Readonly<Record<string, number>>): number =>
  parse(c.algs[starredAlg(c, stars)].moves).length;

export const secondsPerMove = (stat: TimedStat, moves: number): number =>
  stat.totalMs / stat.attempts / moves / 1000;

// Slowest per move first, so the user sees which algorithms to prioritize.
// Cases with too few attempts are excluded: a single lucky or fumbled try
// says nothing about the algorithm.
export function paceRank<T extends TimedStat>(
  cases: readonly Case[],
  stats: Readonly<Record<string, T>>,
  minAttempts: number,
  stars: Readonly<Record<string, number>>,
): { case: Case; stat: T; secondsPerMove: number }[] {
  return cases
    .flatMap((c) => {
      const stat = stats[c.id];
      if (stat === undefined || stat.attempts < minAttempts) return [];
      return [{ case: c, stat, secondsPerMove: secondsPerMove(stat, moveCount(c, stars)) }];
    })
    .toSorted((a, b) => b.secondsPerMove - a.secondsPerMove);
}

// Below this many attempts a case's pace is noise, not signal.
export const MIN_PACE_ATTEMPTS = 3;

// One row shape for both the home dashboard's Drill and Verify tables.
// Accuracy and best time are null for Drill, which has nothing to grade.
export type PaceRow = {
  case: Case;
  attempts: number;
  secondsPerMove: number;
  accuracy: number | null;
  bestMs: number | null;
};

export function drillPaceRows(
  cases: readonly Case[],
  drillStats: Readonly<Record<string, TimedStat>>,
  stars: Readonly<Record<string, number>>,
): PaceRow[] {
  return paceRank(cases, drillStats, MIN_PACE_ATTEMPTS, stars).map(({ case: c, stat, secondsPerMove: spm }) => ({
    case: c,
    attempts: stat.attempts,
    secondsPerMove: spm,
    accuracy: null,
    bestMs: null,
  }));
}

export function verifyPaceRows(
  cases: readonly Case[],
  verifyStats: Readonly<Record<string, VerifyStat>>,
  stars: Readonly<Record<string, number>>,
): PaceRow[] {
  return paceRank(cases, verifyStats, MIN_PACE_ATTEMPTS, stars).map(({ case: c, stat, secondsPerMove: spm }) => ({
    case: c,
    attempts: stat.attempts,
    secondsPerMove: spm,
    accuracy: stat.matches / stat.attempts,
    bestMs: stat.bestMs,
  }));
}
