import { afterEach, describe, expect, it, vi } from "vitest";
import { ALL_CASES } from "../data/algorithms.ts";
import { defaultProgress, exportName, parseProgress, serialize } from "./progress.ts";
import type { Progress } from "./progress.ts";
import type { Card } from "./srs.ts";

const [A, B] = ALL_CASES.map((c) => c.id);
const NOW = 1_800_000_000_000;

const card = (over: Partial<Card> = {}): Card => ({
  ease: 2.5,
  interval: 6,
  reps: 2,
  due: NOW,
  seen: 4,
  known: 3,
  lastGrade: 1,
  ...over,
});

const progress = (over: Partial<Progress> = {}): Progress => ({
  ...defaultProgress(),
  ...over,
});

// A wire-format blob whose fields tests overwrite with bad values.
const blob = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  version: 2,
  updatedAt: NOW,
  prefs: { showNames: true, showSolutions: false, sets: SETS },
  cards: { [A]: card() },
  notes: { [A]: "insert from the back" },
  ...over,
});

const SETS: Progress["prefs"]["sets"] = {
  learn: ["F2L", "2-Look OLL", "2-Look PLL"],
  drill: ["F2L", "2-Look OLL", "2-Look PLL"],
  verify: ["2-Look OLL", "2-Look PLL"],
};

const without = (obj: Record<string, unknown>, key: string) =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => k !== key));

const parse = (obj: unknown) => parseProgress(JSON.stringify(obj), ALL_CASES);

describe("serialize and parseProgress", () => {
  it("round-trips progress, and reports updatedAt with nothing dropped", () => {
    const original = progress({
      prefs: {
        showNames: false,
        showSolutions: true,
        randomRotation: true,
        mode: "drill",
        sets: { ...SETS, learn: ["Full OLL"], drill: ["Full PLL", "F2L"] },
        shuffle: false,
        threeD: true, speed: 2, zoom: 2,
      },
      cards: { [A]: card(), [B]: card({ seen: 1, known: 0, lastGrade: 0 }) },
      notes: { [B]: "hook" },
    });
    expect(parseProgress(serialize(original, NOW), ALL_CASES)).toEqual({
      ok: true,
      progress: original,
      updatedAt: NOW,
      dropped: 0,
      migrated: false,
    });
  });

  it("writes exactly the persisted keys, so UI state cannot leak in unnoticed", () => {
    const written: Record<string, unknown> = JSON.parse(serialize(progress(), NOW));
    expect(Object.keys(written)).toEqual(["version", "updatedAt", "prefs", "cards", "notes"]);
    expect(Object.keys(progress().prefs)).toEqual([
      "showNames", "showSolutions", "randomRotation", "shuffle", "mode", "threeD", "speed", "zoom", "sets",
    ]);
  });
});

describe("parseProgress rejects", () => {
  const bad = (over: Record<string, unknown>) => blob(over);
  const badCard = (over: Record<string, unknown>) => blob({ cards: { [A]: { ...card(), ...over } } });

  it.each<[string, unknown, string]>([
    ["a version of 0", bad({ version: 0 }), "version"],
    ["a version of 3", bad({ version: 3 }), "version"],
    ["a string version", bad({ version: "1" }), "version"],
    ["a missing version", without(blob(), "version"), "version"],
    ["a missing updatedAt", without(blob(), "updatedAt"), "updatedAt"],
    ["a missing prefs section", without(blob(), "prefs"), '"prefs"'],
    ["a missing cards section", without(blob(), "cards"), '"cards"'],
    ["a missing notes section", without(blob(), "notes"), '"notes"'],
    ["a cards section that is a list", bad({ cards: [] }), '"cards"'],
    ["a non-boolean pref", bad({ prefs: { showNames: "yes" } }), "prefs.showNames"],
    ["a non-boolean randomRotation", bad({ prefs: { randomRotation: 1 } }), "prefs.randomRotation"],
    ["an unrecognized mode name", bad({ prefs: { mode: "zbll" } }), "prefs.mode"],
    ["a mode that is not a string", bad({ prefs: { mode: 1 } }), "prefs.mode"],
    ["an F2L set for verify", bad({ prefs: { sets: { verify: ["F2L"] } } }), "prefs.sets.verify"],
    ["an F2L set for verify among others", bad({ prefs: { sets: { verify: ["Full OLL", "F2L"] } } }), "prefs.sets.verify"],
    ["a shuffle that is not a boolean", bad({ prefs: { shuffle: "on" } }), "prefs.shuffle"],
    ["sets that is not an object", bad({ prefs: { sets: ["F2L"] } }), "prefs.sets"],
    ["an empty learn list", bad({ prefs: { sets: { learn: [] } } }), "prefs.sets.learn"],
    ["an empty verify list", bad({ prefs: { sets: { verify: [] } } }), "prefs.sets.verify"],
    ["an unknown set", bad({ prefs: { sets: { drill: ["F2L", "ZBLL"] } } }), "ZBLL"],
    ["a v1 group name used as a set", bad({ prefs: { sets: { learn: ["OLL"] } } }), '"OLL"'],
    ["a set list that is not a list", bad({ prefs: { sets: { learn: "F2L" } } }), "prefs.sets.learn"],
    ["a card that is not an object", bad({ cards: { [A]: 3 } }), `card ${A}`],
    ["a null ease (what JSON makes of NaN)", badCard({ ease: null }), "ease"],
    ["a string ease", badCard({ ease: "2.5" }), "ease"],
    ["an ease below the floor", badCard({ ease: 1.2 }), "ease"],
    ["a fractional interval", badCard({ interval: 1.5 }), "interval"],
    ["a negative interval", badCard({ interval: -1 }), "interval"],
    ["a negative due", badCard({ due: -5 }), "due"],
    ["seen of zero", badCard({ seen: 0, known: 0 }), "seen"],
    ["known above seen", badCard({ seen: 2, known: 3 }), "known"],
    ["a lastGrade of 2", badCard({ lastGrade: 2 }), "lastGrade"],
    ["a note that is not a string", bad({ notes: { [A]: 7 } }), `note ${A}`],
  ])("%s", (_name, input, fragment) => {
    const result = parse(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(fragment);
  });

  it.each(["{nope", "", "[]", "null", "3"])("the non-object text %j", (text) => {
    expect(parseProgress(text, ALL_CASES).ok).toBe(false);
  });
});

describe("parseProgress tolerates", () => {
  it("unknown case ids, dropping and counting them while known ids survive", () => {
    const result = parse(
      blob({
        cards: { [A]: card(), "ghost-1": card(), "ghost-garbage": "not a card" },
        notes: { [A]: "keep", "ghost-2": "lose" },
      }),
    );
    expect(result).toMatchObject({ ok: true, dropped: 3 });
    if (result.ok) {
      expect(Object.keys(result.progress.cards)).toEqual([A]);
      expect(result.progress.notes).toEqual({ [A]: "keep" });
    }
  });

  it("missing pref fields, taking their defaults", () => {
    const result = parse(blob({ prefs: { showNames: false } }));
    expect(result.ok && result.progress.prefs).toEqual({
      showNames: false,
      showSolutions: false,
      randomRotation: false,
      mode: "learn",
      sets: SETS,
      shuffle: true,
      threeD: false, speed: 1, zoom: 1,
    });
  });

  it("a mode given on its own, keeping the other prefs' defaults", () => {
    const result = parse(blob({ prefs: { mode: "drill" } }));
    expect(result.ok && result.progress.prefs).toEqual({
      showNames: true,
      showSolutions: false,
      randomRotation: false,
      mode: "drill",
      sets: SETS,
      shuffle: true,
      threeD: false, speed: 1, zoom: 1,
    });
  });

  it("a set list given for one mode, defaulting the others", () => {
    const result = parse(blob({ prefs: { sets: { drill: ["Full PLL"] } } }));
    expect(result.ok && result.progress.prefs.sets).toEqual({ ...SETS, drill: ["Full PLL"] });
  });

  it("an empty note, storing no entry", () => {
    const result = parse(blob({ notes: { [A]: "" } }));
    expect(result.ok && result.progress.notes).toEqual({});
  });

  it("fields it does not know, without carrying them into progress", () => {
    const result = parse(blob({ cards: { [A]: { ...card(), extra: 1 } } }));
    expect(result.ok && result.progress.cards[A]).toEqual(card());
  });
});

describe("exportName", () => {
  afterEach(() => vi.unstubAllEnvs());

  // Pinned zones make the local-versus-UTC difference show on any machine.
  it("uses the local date on a US evening, when UTC is already tomorrow", () => {
    vi.stubEnv("TZ", "America/Los_Angeles");
    expect(exportName(new Date(2026, 8, 20, 23, 30))).toBe("cfop-progress-2026-09-20.json");
  });

  it("uses the local date just after midnight east of UTC, and zero-pads", () => {
    vi.stubEnv("TZ", "Pacific/Auckland");
    expect(exportName(new Date(2026, 0, 5, 0, 30))).toBe("cfop-progress-2026-01-05.json");
  });
});
