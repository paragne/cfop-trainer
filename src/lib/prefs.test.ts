import { describe, expect, it } from "vitest";
import { defaultPrefs, readPrefs, SPEEDS, ZOOM_RANGE } from "./prefs.ts";

describe("readPrefs for the 3D view", () => {
  it("takes the defaults when a stored blob predates them", () => {
    expect(readPrefs({})).toMatchObject({ threeD: false, speed: 1, zoom: 1 });
    expect(readPrefs({})).toEqual(defaultPrefs());
  });

  it("ignores the stepMode and radius keys earlier builds wrote", () => {
    expect(readPrefs({ stepMode: true, radius: 99 })).toEqual(defaultPrefs());
  });

  it("accepts both ends of the zoom slider", () => {
    expect(readPrefs({ zoom: ZOOM_RANGE.min }).zoom).toBe(ZOOM_RANGE.min);
    expect(readPrefs({ zoom: ZOOM_RANGE.max }).zoom).toBe(ZOOM_RANGE.max);
  });

  it.each(SPEEDS)("keeps the offered speed %s", (speed) => {
    expect(readPrefs({ speed }).speed).toBe(speed);
  });

  it.each([
    [0.25, 0.2],
    [0.4, 0.5],
    [1.4, 1],
    [3, 2],
    [3.1, 4],
    [7, 4],
    [8, 10],
    [100, 10],
    [0, 0.2],
  ])("snaps a slider-era speed of %s to %s", (stored, snapped) => {
    expect(readPrefs({ speed: stored }).speed).toBe(snapped);
  });

  it.each([
    ["a non-boolean threeD", { threeD: "on" }, "prefs.threeD"],
    ["a null speed (what JSON makes of NaN)", { speed: null }, "prefs.speed"],
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
