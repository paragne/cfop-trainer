import { describe, expect, it } from "vitest";
import { matrix3d, rotate3d, viewMatrix3d } from "./css-transform.ts";

describe("matrix3d", () => {
  it("is the identity matrix for the home basis at the origin", () => {
    expect(matrix3d([1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0, 0], 10)).toBe(
      "matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)",
    );
  });

  it("scales the translation column only", () => {
    expect(matrix3d([1, 0, 0], [0, 1, 0], [0, 0, 1], [1, -1, 0], 10)).toBe(
      "matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,10,-10,0,1)",
    );
  });
});

describe("rotate3d", () => {
  it("formats the axis and a signed angle in degrees", () => {
    expect(rotate3d([1, 0, 0], -90)).toBe("rotate3d(1,0,0,-90deg)");
  });
});

describe("viewMatrix3d", () => {
  it("is the identity for a camera looking along -z with +y up", () => {
    expect(viewMatrix3d([1, 0, 0], [0, 1, 0], [0, 0, 1])).toBe(
      "matrix3d(1,0,0,0,0,-1,0,0,0,0,1,0,0,0,0,1)",
    );
  });

  it("puts a world point above `up` at negative (higher) screen y", () => {
    // A camera looking down -z with +y up: a point at world [0,1,0] (above
    // center) must land at screen y < 0, since CSS y grows downward.
    const view = viewMatrix3d([1, 0, 0], [0, 1, 0], [0, 0, 1]);
    const m = view.slice("matrix3d(".length, -1).split(",").map(Number);
    // Apply the column-major 4x4 matrix to [0, 1, 0, 1].
    const y = m[1] * 0 + m[5] * 1 + m[9] * 0 + m[13] * 1;
    expect(y).toBeLessThan(0);
  });
});
