import { describe, expect, it } from "vitest";
import { defaultPrefs, readPrefs, SPEED_RANGE, ZOOM_RANGE } from "./prefs.ts";

describe("readPrefs for the 3D view", () => {
  it("takes the defaults when a stored blob predates them", () => {
    expect(readPrefs({})).toMatchObject({ threeD: false, speed: 1, zoom: 1 });
    expect(readPrefs({})).toEqual(defaultPrefs());
  });

  it("ignores the stepMode and radius keys earlier builds wrote", () => {
    expect(readPrefs({ stepMode: true, radius: 99 })).toEqual(defaultPrefs());
  });

  it.each([
    ["speed", SPEED_RANGE],
    ["zoom", ZOOM_RANGE],
  ] as const)("accepts both ends of the %s slider", (key, { min, max }) => {
    expect(readPrefs({ [key]: min })[key]).toBe(min);
    expect(readPrefs({ [key]: max })[key]).toBe(max);
  });

  it.each([
    ["a non-boolean threeD", { threeD: "on" }, "prefs.threeD"],
    ["a speed below the slider", { speed: SPEED_RANGE.min / 2 }, "prefs.speed"],
    ["a speed above the slider", { speed: SPEED_RANGE.max + 1 }, "prefs.speed"],
    ["a string speed", { speed: "2" }, "prefs.speed"],
    ["a zoom below the range", { zoom: ZOOM_RANGE.min - 0.1 }, "prefs.zoom"],
    ["a null zoom (what JSON makes of NaN)", { zoom: null }, "prefs.zoom"],
  ])("rejects %s", (_name, raw, fragment) => {
    expect(() => readPrefs(raw)).toThrow(fragment);
  });
});

describe("readPrefs for Verify's sets", () => {
  // Excluded by group, so a new F2L set is covered without being named in prefs.ts.
  it.each([[["F2L"]], [["Advanced F2L"]], [["Expert F2L"]], [["Full OLL", "Advanced F2L"]]])("rejects %j", (verify) => {
    expect(() => readPrefs({ sets: { verify } })).toThrow("prefs.sets.verify");
  });

  it("accepts every last-layer set", () => {
    const verify = ["2-Look OLL", "2-Look PLL", "Full OLL", "Full PLL"];
    expect(readPrefs({ sets: { verify } }).sets.verify).toEqual(verify);
  });
});
