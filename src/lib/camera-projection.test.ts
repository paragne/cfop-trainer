import { describe, expect, it } from "vitest";
import { MOVE_AXES } from "./cube.ts";
import type { Vec } from "./cube.ts";
import { parse } from "./notation.ts";
import { applyAlgPhysical, homeStickers } from "./physical-cube.ts";
import { screenAxes } from "./camera-projection.ts";

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const inLayer = (name: "R" | "L", position: Vec) =>
  MOVE_AXES[name].depths.includes(dot(MOVE_AXES[name].axis, position));

describe("screenAxes", () => {
  it("is orthonormal", () => {
    const { right, up } = screenAxes([1, 1, 1]);
    expect(dot(right, right)).toBeCloseTo(1);
    expect(dot(up, up)).toBeCloseTo(1);
    expect(dot(right, up)).toBeCloseTo(0);
  });

  it("matches render.ts's isometric screen-x formula (x - z)", () => {
    const { right } = screenAxes([1, 1, 1]);
    // right must be parallel to [1, 0, -1], the (x - z) direction.
    expect(right[0]).toBeCloseTo(-right[2]);
    expect(right[1]).toBeCloseTo(0);
    expect(right[0]).toBeGreaterThan(0);
  });
});

// The concrete case from the locked-camera decision: with a world-fixed
// camera, R's layer is always the same fixed half of space, so it always
// falls on the same side of the screen no matter what rotated before it —
// unlike a camera that followed x/y/z moves, which would make this false.
describe("world-fixed camera: R always turns the screen-right layer", () => {
  const { right } = screenAxes([1, 1, 1]);
  const preludes = ["", "y'", "y", "y2", "x", "x'", "z2"];

  it.each(preludes)("after %j, R's layer reads screen-right and L's reads screen-left", (prelude) => {
    const stickers = applyAlgPhysical(homeStickers(), parse(prelude));
    for (const sticker of stickers) {
      const screenX = dot(sticker.position, right);
      if (screenX === 0) continue; // the R/F (or L/B) seam in this view, not a bug
      if (inLayer("R", sticker.position)) expect(screenX).toBeGreaterThan(0);
      if (inLayer("L", sticker.position)) expect(screenX).toBeLessThan(0);
    }
  });
});
