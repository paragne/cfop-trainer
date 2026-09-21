import { describe, expect, it } from "vitest";
import { ALL_CASES } from "../data/algorithms.ts";
import type { Group } from "../data/algorithms.ts";
import { defaultProgress, parseProgress, serialize } from "./progress.ts";
import type { Progress } from "./progress.ts";
import { setNote, setPref, toggleGroup } from "./progress-edit.ts";

const [A, B] = ALL_CASES.map((c) => c.id);

const progress = (notes: Record<string, string> = {}): Progress => ({
  ...defaultProgress(ALL_CASES),
  notes,
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

describe("toggleGroup", () => {
  const withGroups = (groups: Group[]): Progress => {
    const base = progress({ [A]: "x" });
    return { ...base, prefs: { ...base.prefs, groups } };
  };

  it("removes a selected group, keeping the others in order", () => {
    expect(toggleGroup(withGroups(["F2L", "OLL", "PLL"]), "OLL").prefs.groups).toEqual(["F2L", "PLL"]);
  });

  it("adds a group that is not selected", () => {
    expect(toggleGroup(withGroups(["PLL"]), "F2L").prefs.groups).toEqual(["PLL", "F2L"]);
  });

  it("refuses to switch off the last group, returning the same object", () => {
    const only = withGroups(["OLL"]);
    expect(toggleGroup(only, "OLL")).toBe(only);
  });

  it("changes nothing but the groups, and not its input", () => {
    const before = withGroups(["F2L", "OLL"]);
    const snapshot = structuredClone(before);
    const after = toggleGroup(before, "OLL");
    expect(before).toEqual(snapshot);
    expect(after.notes).toBe(before.notes);
    expect(after.cards).toBe(before.cards);
    expect([after.prefs.showNames, after.prefs.showSolutions]).toEqual([before.prefs.showNames, before.prefs.showSolutions]);
  });
});
