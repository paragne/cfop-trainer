import { describe, expect, it } from "vitest";
import { rotate } from "./cube.ts";
import type { Vec } from "./cube.ts";
import { rotateByAngle } from "./rotate-by-angle.ts";

const AXES: Vec[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
const VECTORS: Vec[] = [
  [1, 0, 0],
  [1, 1, 1],
  [-1, 1, 0],
  [0, -1, 1],
];

const close = (a: Vec, b: Vec) => a.every((n, i) => Math.abs(n - b[i]) < 1e-9);

describe("rotateByAngle", () => {
  it("is the identity at 0 degrees", () => {
    for (const axis of AXES) {
      for (const v of VECTORS) expect(close(rotateByAngle(v, axis, 0), v)).toBe(true);
    }
  });

  it("matches cube.ts's quarter-turn rotate() at 90 degrees", () => {
    for (const axis of AXES) {
      for (const v of VECTORS) expect(close(rotateByAngle(v, axis, 90), rotate(v, axis))).toBe(true);
    }
  });

  it("composes: rotating by a then b equals rotating by a + b", () => {
    for (const axis of AXES) {
      for (const v of VECTORS) {
        const stepped = rotateByAngle(rotateByAngle(v, axis, 37), axis, 52);
        expect(close(stepped, rotateByAngle(v, axis, 89))).toBe(true);
      }
    }
  });

  it("preserves length", () => {
    const v: Vec = [1, 1, 1];
    const axis: Vec = [0, 1, 0];
    const before = Math.hypot(...v);
    const after = Math.hypot(...rotateByAngle(v, axis, 41));
    expect(after).toBeCloseTo(before);
  });
});
