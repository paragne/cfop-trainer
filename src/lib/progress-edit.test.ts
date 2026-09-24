import { describe, expect, it } from "vitest";
import { ALL_CASES } from "../data/algorithms.ts";
import type { CaseSet } from "../data/algorithms.ts";
import { defaultProgress, parseProgress, serialize } from "./progress.ts";
import type { Progress } from "./progress.ts";
import { setMode, setNote, setNumberPref, setPref, setVerifyLength, toggleSet } from "./progress-edit.ts";

const [A, B] = ALL_CASES.map((c) => c.id);

const progress = (notes: Record<string, string> = {}): Progress => ({
  ...defaultProgress(),
  notes,
});

describe("setMode", () => {
  it("changes only the mode", () => {
    const before = progress({ [A]: "keep" });
    const after = setMode(before, "drill");
    expect(after.prefs).toEqual({ ...before.prefs, mode: "drill" });
    expect(after.notes).toBe(before.notes);
    expect(after.cards).toBe(before.cards);
  });

  it("survives a save and reload", () => {
    const saved = serialize(setMode(progress(), "drill"), 1);
    const loaded = parseProgress(saved, ALL_CASES);
    expect(loaded.ok && loaded.progress.prefs.mode).toBe("drill");
  });
});

describe("setNote", () => {
  it("sets a note and leaves the others", () => {
    expect(setNote(progress({ [B]: "keep" }), A, "new").notes).toEqual({ [B]: "keep", [A]: "new" });
  });

  it("replaces an existing note", () => {
    expect(setNote(progress({ [A]: "old" }), A, "new").notes).toEqual({ [A]: "new" });
  });

  it("deletes the entry when the text is emptied, rather than storing an empty string", () => {
    const cleared = setNote(progress({ [A]: "old", [B]: "keep" }), A, "");
    expect(cleared.notes).toEqual({ [B]: "keep" });
    expect(A in cleared.notes).toBe(false);
  });

  it("survives a save and reload the same way", () => {
    const cleared = setNote(progress({ [A]: "old" }), A, "");
    const reloaded = parseProgress(serialize(cleared, 0), ALL_CASES);
    expect(reloaded.ok && reloaded.progress).toEqual(cleared);
  });

  it("does not modify its input", () => {
    const before = Object.freeze(progress(Object.freeze({ [A]: "old" })));
    expect(() => setNote(before, A, "new")).not.toThrow();
    expect(() => setNote(before, A, "")).not.toThrow();
  });
});

describe("setPref", () => {
  it.each(["showNames", "showSolutions"] as const)("changes only %s", (key) => {
    const before = progress({ [A]: "x" });
    const after = setPref(before, key, !before.prefs[key]);
    expect(after.prefs[key]).toBe(!before.prefs[key]);
    expect({ ...after.prefs, [key]: before.prefs[key] }).toEqual(before.prefs);
    expect(after.notes).toBe(before.notes);
    expect(after.cards).toBe(before.cards);
  });
});

describe("setPref for the random AUF", () => {
  it("turns it on, changes nothing else, and survives a save and reload", () => {
    const before = progress({ [A]: "x" });
    expect(before.prefs.randomRotation).toBe(false);
    const after = setPref(before, "randomRotation", true);
    expect({ ...after.prefs, randomRotation: false }).toEqual(before.prefs);
    expect(after.notes).toBe(before.notes);
    const loaded = parseProgress(serialize(after, 1), ALL_CASES);
    expect(loaded.ok && loaded.progress.prefs.randomRotation).toBe(true);
  });
});

describe("setVerifyLength", () => {
  it("changes only the length, and survives a save and reload", () => {
    const before = progress({ [A]: "keep" });
    const after = setVerifyLength(before, 5);
    expect(after.prefs).toEqual({ ...before.prefs, verifyLength: 5 });
    expect(after.notes).toBe(before.notes);
    const loaded = parseProgress(serialize(after, 1), ALL_CASES);
    expect(loaded.ok && loaded.progress.prefs.verifyLength).toBe(5);
  });
});

describe("the 3D view prefs", () => {
  it("changes only the pref set, and survives a save and reload", () => {
    const before = progress({ [A]: "keep" });
    const after = setNumberPref(setNumberPref(setPref(before, "threeD", true), "speed", 4), "zoom", 2.5);
    expect(after.prefs).toEqual({ ...before.prefs, threeD: true, speed: 4, zoom: 2.5 });
    expect(after.notes).toBe(before.notes);
    const loaded = parseProgress(serialize(after, 1), ALL_CASES);
    expect(loaded.ok && loaded.progress.prefs).toMatchObject({ threeD: true, speed: 4, zoom: 2.5 });
  });

  it("still writes version 2, so a blob from before them loads without a migration", () => {
    const written: { version: number } = JSON.parse(serialize(progress({}), 1));
    expect(written.version).toBe(2);
  });
});

describe("toggleSet", () => {
  const withLearn = (learn: CaseSet[]): Progress => {
    const base = progress({ [A]: "x" });
    return { ...base, prefs: { ...base.prefs, sets: { ...base.prefs.sets, learn } } };
  };

  it("removes a selected set, keeping the others in order", () => {
    const after = toggleSet(withLearn(["F2L", "2-Look OLL", "Full PLL"]), "learn", "2-Look OLL");
    expect(after.prefs.sets.learn).toEqual(["F2L", "Full PLL"]);
  });

  it("adds a set that is not selected", () => {
    expect(toggleSet(withLearn(["Full PLL"]), "learn", "F2L").prefs.sets.learn).toEqual(["Full PLL", "F2L"]);
  });

  it("refuses to switch off the last set, returning the same object", () => {
    const only = withLearn(["Full OLL"]);
    expect(toggleSet(only, "learn", "Full OLL")).toBe(only);
  });

  it("changes only the chosen mode, and not its input", () => {
    const before = withLearn(["F2L", "2-Look OLL"]);
    const snapshot = structuredClone(before);
    const after = toggleSet(before, "verify", "Full OLL");
    expect(before).toEqual(snapshot);
    expect(after.prefs.sets.verify).toEqual([...before.prefs.sets.verify, "Full OLL"]);
    expect(after.prefs.sets.learn).toBe(before.prefs.sets.learn);
    expect(after.prefs.sets.drill).toBe(before.prefs.sets.drill);
    expect(after.notes).toBe(before.notes);
    expect(after.cards).toBe(before.cards);
    expect([after.prefs.showNames, after.prefs.showSolutions]).toEqual([before.prefs.showNames, before.prefs.showSolutions]);
  });
});
