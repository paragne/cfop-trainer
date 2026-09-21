import { describe, expect, it } from "vitest";
import { grade, recount } from "./srs.ts";
import type { Card } from "./srs.ts";

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;

const card = (over: Partial<Card> = {}): Card =>
  Object.freeze({
    ease: 2.5,
    interval: 6,
    reps: 2,
    due: NOW,
    seen: 4,
    known: 3,
    lastGrade: 1,
    ...over,
  });

// Grades `n` times in a row from an unseen card, returning every record.
function run(n: number, know: boolean): Card[] {
  const out: Card[] = [];
  let prev: Card | null = null;
  for (let i = 0; i < n; i++) {
    prev = grade(prev, know, NOW);
    out.push(prev);
  }
  return out;
}

describe("grade: don't know", () => {
  it("scores an unseen card as a first failure", () => {
    expect(grade(null, false, NOW)).toEqual({
      ease: 2.3,
      interval: 1,
      reps: 0,
      due: NOW + DAY,
      seen: 1,
      known: 0,
      lastGrade: 0,
    });
  });

  it("resets a mature card to interval 1 and reps 0", () => {
    const failed = grade(card({ interval: 40, reps: 5 }), false, NOW);
    expect(failed).toMatchObject({ interval: 1, reps: 0, ease: 2.3, seen: 5, known: 3 });
  });

  it("floors ease at 1.3", () => {
    expect(run(10, false).map((c) => c.ease)).toEqual([
      2.3, 2.1, 1.9, 1.7, 1.5, 1.3, 1.3, 1.3, 1.3, 1.3,
    ]);
  });
});

describe("grade: know it", () => {
  it("steps the interval 1, 6, then multiplies by the earlier ease", () => {
    // Worked by hand: 6 * 2.6 = 15.6 -> 16, 16 * 2.65 = 42.4 -> 42,
    // 42 * 2.7 = 113.4 -> 113, 113 * 2.75 = 310.75 -> 311.
    expect(run(6, true).map((c) => c.interval)).toEqual([1, 6, 16, 42, 113, 311]);
  });

  it("raises ease by 0.05 and caps it at 3.0", () => {
    const eases = run(20, true).map((c) => c.ease);
    expect(eases.slice(0, 3)).toEqual([2.55, 2.6, 2.65]);
    expect(Math.max(...eases)).toBe(3.0);
    expect(eases.at(-1)).toBe(3.0);
  });

  it("grows the interval strictly on every repeated success", () => {
    const intervals = run(30, true).map((c) => c.interval);
    intervals.slice(1).forEach((n, i) => expect(n).toBeGreaterThan(intervals[i]));
  });

  it("still grows at the ease floor, where rounding is most likely to stall it", () => {
    let prev: Card = card({ ease: 1.3, interval: 6, reps: 2 });
    for (let i = 0; i < 10; i++) {
      const next = grade(prev, true, NOW);
      expect(next.interval).toBeGreaterThan(prev.interval);
      prev = next;
    }
  });

  it("counts the attempt and the success", () => {
    expect(grade(card(), true, NOW)).toMatchObject({ seen: 5, known: 4, lastGrade: 1, reps: 3 });
  });
});

describe("grade: both", () => {
  it.each([true, false])("sets due to now plus interval days (know=%s)", (know) => {
    const next = grade(card(), know, NOW);
    expect(next.due).toBe(NOW + next.interval * DAY);
  });

  it("returns a new record and leaves a frozen input alone", () => {
    const prev = card();
    const before = { ...prev };
    const next = grade(prev, true, NOW);
    expect(next).not.toBe(prev);
    expect(prev).toEqual(before);
  });
});

describe("recount", () => {
  it("moves only seen, known and lastGrade on success", () => {
    const prev = card({ lastGrade: 0 });
    const next = recount(prev, true);
    expect(next).toEqual({ ...prev, seen: 5, known: 4, lastGrade: 1 });
  });

  it("leaves known alone on failure and never touches the schedule", () => {
    const prev = card({ ease: 2.3, interval: 1, reps: 0, due: NOW + DAY });
    const next = recount(prev, false);
    expect(next).toEqual({ ...prev, seen: 5, lastGrade: 0 });
  });

  it("returns a new record and leaves a frozen input alone", () => {
    const prev = card();
    const before = { ...prev };
    expect(recount(prev, true)).not.toBe(prev);
    expect(prev).toEqual(before);
  });
});
