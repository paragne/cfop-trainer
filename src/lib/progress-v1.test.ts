import { describe, expect, it } from "vitest";
import { ALL_CASES } from "../data/algorithms.ts";
import { parseProgress } from "./progress.ts";
import { V1_BLOB } from "./progress-v1.fixture.ts";

const NOW = 1_789_000_000_000;
const DAY = 86_400_000;

// Written out by hand rather than read back from the fixture, so a parser that
// mangles a field cannot agree with itself.
const CARDS = {
  "f2l-easy-1": { ease: 2.6, interval: 6, reps: 2, due: NOW + 6 * DAY, seen: 3, known: 3, lastGrade: 1 },
  "f2l-connected-5": { ease: 1.9, interval: 1, reps: 0, due: NOW - DAY, seen: 5, known: 2, lastGrade: 0 },
  "oll-27": { ease: 2.5, interval: 1, reps: 1, due: NOW + DAY, seen: 1, known: 1, lastGrade: 1 },
  "oll-cross-dot": { ease: 1.3, interval: 1, reps: 0, due: NOW, seen: 8, known: 1, lastGrade: 0 },
  "pll-ua": { ease: 2.75, interval: 16, reps: 3, due: NOW + 16 * DAY, seen: 4, known: 4, lastGrade: 1 },
  "pll-corners-adjacent": { ease: 2.3, interval: 6, reps: 2, due: NOW + 3 * DAY, seen: 6, known: 4, lastGrade: 1 },
};

const NOTES = {
  "f2l-easy-1": "insert from the back, don't rotate",
  "pll-ua": "headlights on the left → M-slice first\nthen the “other” U, é",
  "oll-27": "sune",
};

describe("the frozen v1 blob", () => {
  it("is still a version 1 blob with the v1 prefs shape", () => {
    expect(JSON.parse(V1_BLOB)).toMatchObject({
      version: 1,
      updatedAt: NOW,
      prefs: { showNames: false, showSolutions: true, groups: ["F2L", "PLL"] },
    });
    expect(V1_BLOB).not.toContain('"sets"');
  });

  it("names only cases that exist, so a dropped id can never hide a lost card", () => {
    const ids = new Set(ALL_CASES.map((c) => c.id));
    const raw: { cards: Record<string, unknown>; notes: Record<string, unknown> } = JSON.parse(V1_BLOB);
    expect([...Object.keys(raw.cards), ...Object.keys(raw.notes)].filter((id) => !ids.has(id))).toEqual([]);
  });

  // Groups become the 2-look sets, and the modes v1 never had take their defaults.
  it("is migrated on read, every card and note intact", () => {
    expect(parseProgress(V1_BLOB, ALL_CASES)).toEqual({
      ok: true,
      progress: {
        prefs: {
          showNames: false,
          showSolutions: true,
          showNotes: true,
          randomRotation: false,
          mode: "learn",
          shuffle: true,
          threeD: false,
          speed: 1,
          zoom: 1,
          showHotkeys: true,
          skipLearnIntro: false,
          skipDrillIntro: false,
          skipVerifyIntro: false,
          sets: {
            learn: ["F2L", "2-Look PLL"],
            drill: ["F2L", "2-Look OLL", "2-Look PLL"],
            verify: ["2-Look OLL", "2-Look PLL"],
          },
        },
        cards: CARDS,
        notes: NOTES,
        drillStats: {},
        verifyStats: {},
      },
      updatedAt: NOW,
      dropped: 0,
      migrated: true,
    });
  });
});
