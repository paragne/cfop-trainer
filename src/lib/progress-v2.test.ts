import { describe, expect, it } from "vitest";
import { ALL_CASES } from "../data/algorithms.ts";
import { parseProgress } from "./progress.ts";
import { V2_BLOB } from "./progress-v2.fixture.ts";

const NOW = 1_789_000_000_000;
const DAY = 86_400_000;

// Written out by hand rather than read back from the fixture, so a parser that
// mangles a field cannot agree with itself.
const CARDS = {
  "f2l-slot-4": { ease: 2.2, interval: 6, reps: 2, due: NOW + 6 * DAY, seen: 4, known: 3, lastGrade: 1 },
  "oll-42": { ease: 1.3, interval: 1, reps: 0, due: NOW - DAY, seen: 9, known: 2, lastGrade: 0 },
  "pll-gd": { ease: 2.85, interval: 15, reps: 3, due: NOW + 15 * DAY, seen: 3, known: 3, lastGrade: 1 },
};

const NOTES = {
  "f2l-slot-4": "rotate early\nthen the y' is free",
  "oll-42": "not a Sune — “back” first, é",
};

describe("a frozen version 2 blob", () => {
  it("is read as it was written, every pref, card and note intact", () => {
    expect(parseProgress(V2_BLOB, ALL_CASES)).toEqual({
      ok: true,
      progress: {
        prefs: {
          showNames: false,
          showSolutions: true,
          showNotes: true,
          randomRotation: true,
          mode: "drill",
          shuffle: true,
          threeD: true,
          // The blob predates the fixed speed choices; 1.5 sits halfway between
          // 1x and 2x and snaps to the slower.
          speed: 1,
          zoom: 2,
          hotkeyLabels: "keyboard",
          sets: {
            learn: ["Full OLL", "F2L"],
            drill: ["2-Look PLL", "Full PLL"],
            verify: ["Full OLL", "2-Look OLL"],
          },
        },
        cards: CARDS,
        notes: NOTES,
      },
      updatedAt: NOW,
      dropped: 0,
      migrated: false,
    });
  });
});
