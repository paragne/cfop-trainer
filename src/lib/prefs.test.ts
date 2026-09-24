import { describe, expect, it } from "vitest";
import { defaultPrefs, readPrefs, RADIUS_RANGE, SPEED_RANGE } from "./prefs.ts";

describe("readPrefs for the 3D view", () => {
  it("takes the defaults when a stored blob predates them", () => {
    expect(readPrefs({})).toMatchObject({ stepMode: false, speed: 1, radius: 12 });
    expect(readPrefs({})).toEqual(defaultPrefs());
  });

  it.each([
    ["speed", SPEED_RANGE],
    ["radius", RADIUS_RANGE],
  ] as const)("accepts both ends of the %s slider", (key, { min, max }) => {
    expect(readPrefs({ [key]: min })[key]).toBe(min);
    expect(readPrefs({ [key]: max })[key]).toBe(max);
  });

  it.each([
    ["a non-boolean stepMode", { stepMode: "on" }, "prefs.stepMode"],
    ["a speed below the slider", { speed: SPEED_RANGE.min / 2 }, "prefs.speed"],
    ["a speed above the slider", { speed: SPEED_RANGE.max + 1 }, "prefs.speed"],
    ["a string speed", { speed: "2" }, "prefs.speed"],
    ["a radius below the slider", { radius: RADIUS_RANGE.min - 1 }, "prefs.radius"],
    ["a null radius (what JSON makes of NaN)", { radius: null }, "prefs.radius"],
  ])("rejects %s", (_name, raw, fragment) => {
    expect(() => readPrefs(raw)).toThrow(fragment);
  });
});
