import { describe, expect, it } from "vitest";
import { SET_GROUP } from "../data/algorithms.ts";
import type { Case } from "../data/algorithms.ts";
import { paceRank, recordMatch, recordTime, secondsPerMove } from "./timed-stats.ts";
import type { TimedStat, VerifyStat } from "./timed-stats.ts";

const mk = (id: string, moves: string): Case => ({
  id,
  group: SET_GROUP.F2L,
  sets: ["F2L"],
  section: "",
  name: null,
  aliases: [],
  algs: [{ display: moves, moves }],
  mask: { kind: "f2l", slot: "FR" },
  setup: null,
  videoUrl: null,
});

describe("recordTime", () => {
  it("starts a record at one attempt from a null prior", () => {
    expect(recordTime(null, 4000)).toEqual({ attempts: 1, totalMs: 4000, bestMs: 4000, lastMs: 4000 });
  });

  it("sums total time and keeps attempts monotonic", () => {
    const first = recordTime(null, 4000);
    const second = recordTime(first, 2000);
    expect(second.attempts).toBe(2);
    expect(second.totalMs).toBe(6000);
  });

  it("keeps the best as the minimum across every attempt, even a slower latest", () => {
    const first = recordTime(null, 2000);
    const slower = recordTime(first, 5000);
    expect(slower.bestMs).toBe(2000);
    expect(slower.lastMs).toBe(5000);
  });

  it("updates the best when the latest attempt beats it", () => {
    const first = recordTime(null, 5000);
    const faster = recordTime(first, 2000);
    expect(faster.bestMs).toBe(2000);
    expect(faster.lastMs).toBe(2000);
  });
});

describe("recordMatch", () => {
  it("throws when no attempt was recorded first", () => {
    expect(() => recordMatch(undefined)).toThrow(/prior/);
  });

  it("increments matches and leaves the timing alone", () => {
    const stat: VerifyStat = { attempts: 3, totalMs: 9000, bestMs: 2000, lastMs: 4000, matches: 1 };
    expect(recordMatch(stat)).toEqual({ ...stat, matches: 2 });
  });
});

describe("secondsPerMove", () => {
  it("divides average attempt time by the move count", () => {
    const stat: TimedStat = { attempts: 2, totalMs: 8000, bestMs: 3000, lastMs: 5000 };
    // Average attempt is 4000ms over 4 moves = 1000ms/move = 1s/move.
    expect(secondsPerMove(stat, 4)).toBe(1);
  });
});

describe("paceRank", () => {
  const cases = [mk("slow", "R U R' U'"), mk("fast", "R U R'"), mk("unseen", "R U")];

  it("excludes cases below the attempt threshold", () => {
    const stats = { slow: recordTime(null, 8000), fast: recordTime(null, 3000) };
    const ranked = paceRank(cases, stats, 2, {});
    expect(ranked).toEqual([]);
  });

  it("sorts slowest seconds per move first", () => {
    // slow: 8000ms / 4 moves = 2000ms/move. fast: 3000ms / 3 moves = 1000ms/move.
    const stats = { slow: recordTime(null, 8000), fast: recordTime(null, 3000) };
    const ranked = paceRank(cases, stats, 1, {});
    expect(ranked.map((r) => r.case.id)).toEqual(["slow", "fast"]);
    expect(ranked[0].secondsPerMove).toBeCloseTo(2);
    expect(ranked[1].secondsPerMove).toBeCloseTo(1);
  });

  it("counts the moves of the starred alg, not the primary", () => {
    const two: Case = { ...mk("two", "R U R' U'"), algs: [{ display: "R U R' U'", moves: "R U R' U'" }, { display: "R U", moves: "R U" }] };
    const stats = { two: recordTime(null, 4000) };
    // Primary: 4000ms / 4 moves = 1s. Starred alternate: 4000ms / 2 moves = 2s.
    expect(paceRank([two], stats, 1, {})[0].secondsPerMove).toBeCloseTo(1);
    expect(paceRank([two], stats, 1, { two: 1 })[0].secondsPerMove).toBeCloseTo(2);
  });

  it("falls back to the primary when the star points past the algs", () => {
    const stats = { slow: recordTime(null, 8000) };
    expect(paceRank(cases, stats, 1, { slow: 5 })[0].secondsPerMove).toBeCloseTo(2);
  });
});
