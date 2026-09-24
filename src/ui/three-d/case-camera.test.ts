import { describe, expect, it } from "vitest";
import type { Mask } from "../../data/algorithms.ts";
import { eyeFor } from "./case-camera.ts";

const angleFromVertical = (eye: readonly number[]) => (Math.acos(eye[1] / Math.hypot(...eye)) * 180) / Math.PI;

describe("the default eye for a case", () => {
  it("is (1,1,1) for a front-right F2L slot, matching the 2D isometric picture", () => {
    expect(eyeFor({ kind: "f2l", slot: "FR" })).toEqual([1, 1, 1]);
  });

  it("is (-1,1,1) for a front-left slot, the same view mirrored across x", () => {
    expect(eyeFor({ kind: "f2l", slot: "FL" })).toEqual([-1, 1, 1]);
  });

  it.each<Mask>([{ kind: "oll-edges" }, { kind: "oll-full" }, { kind: "pll-corners" }, { kind: "pll-full" }])(
    "looks nearly straight down, from the front and centered, for $kind",
    (mask) => {
      const eye = eyeFor(mask);
      expect(eye[0]).toBe(0);
      expect(eye[2]).toBeGreaterThan(0);
      expect(angleFromVertical(eye)).toBeLessThan(30);
    },
  );
});
