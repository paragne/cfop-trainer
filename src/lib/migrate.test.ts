import { describe, expect, it } from "vitest";
import { migrateV1toV2 } from "./migrate.ts";

const v1 = (prefs: unknown): Record<string, unknown> => ({
  version: 1,
  updatedAt: 7,
  prefs,
  cards: { "oll-27": { seen: 1 } },
  notes: { "oll-27": "sune" },
});

const prefsFor = (groups: unknown) => migrateV1toV2(v1({ showNames: true, groups })).prefs;

describe("migrateV1toV2", () => {
  it.each([
    [["F2L"], ["F2L"]],
    [["OLL"], ["2-Look OLL"]],
    [["PLL"], ["2-Look PLL"]],
    [["F2L", "OLL", "PLL"], ["F2L", "2-Look OLL", "2-Look PLL"]],
    [["PLL", "F2L"], ["2-Look PLL", "F2L"]],
  ])("turns the groups %j into the learn sets %j", (groups, learn) => {
    expect(prefsFor(groups)).toEqual({ showNames: true, sets: { learn } });
  });

  it("stamps version 2 and leaves cards, notes and updatedAt as they were", () => {
    const before = v1({ showNames: false, showSolutions: true, groups: ["OLL"] });
    const after = migrateV1toV2(before);
    expect(after.version).toBe(2);
    expect({ ...after, version: 1 }).toMatchObject({
      updatedAt: 7,
      cards: { "oll-27": { seen: 1 } },
      notes: { "oll-27": "sune" },
    });
    expect(after.prefs).toEqual({ showNames: false, showSolutions: true, sets: { learn: ["2-Look OLL"] } });
  });

  it("writes no sets when v1 had no groups, so the defaults apply", () => {
    expect(migrateV1toV2(v1({ showNames: false })).prefs).toEqual({ showNames: false });
  });

  // The v2 reader is what rejects these, so the migration must not hide them.
  it.each([
    ["an unknown group", ["ZBLL"], ["ZBLL"]],
    ["a non-string entry", ["F2L", 3], ["F2L", 3]],
    ["a string", "F2L", "F2L"],
    ["an empty list", [], []],
  ])("passes malformed groups (%s) through unmapped", (_name, groups, learn) => {
    expect(prefsFor(groups)).toEqual({ showNames: true, sets: { learn } });
  });

  it("leaves a blob with no usable prefs section to be rejected by the reader", () => {
    expect(migrateV1toV2(v1("nope")).prefs).toBe("nope");
    expect(migrateV1toV2(v1(["F2L"])).version).toBe(2);
  });

  it("does not modify its input", () => {
    const before = Object.freeze(v1(Object.freeze({ groups: Object.freeze(["OLL"]) })));
    expect(() => migrateV1toV2(before)).not.toThrow();
    expect(before.version).toBe(1);
  });
});
