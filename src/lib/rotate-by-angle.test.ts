import { describe, expect, it } from "vitest";
import { rotate } from "./cube.ts";
import type { Vec } from "./cube.ts";
import { rotateByAngle, rotationBetweenFrames } from "./rotate-by-angle.ts";
import type { Frame } from "./rotate-by-angle.ts";

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

const FRAME: Frame = { right: [1, 0, 0], up: [0, 1, 0], back: [0, 0, 1] };

function rotateFrame(frame: Frame, axis: Vec, degrees: number): Frame {
  return {
    right: rotateByAngle(frame.right, axis, degrees),
    up: rotateByAngle(frame.up, axis, degrees),
    back: rotateByAngle(frame.back, axis, degrees),
  };
}

describe("rotationBetweenFrames", () => {
  it("finds zero degrees for identical frames", () => {
    expect(rotationBetweenFrames(FRAME, FRAME).degrees).toBeCloseTo(0);
  });

  it("recovers a rotation that carries from onto to, at ordinary angles", () => {
    for (const axis of AXES) {
      for (const degrees of [30, 90, 137, 200]) {
        const to = rotateFrame(FRAME, axis, degrees);
        const found = rotationBetweenFrames(FRAME, to);
        const reproduced = rotateFrame(FRAME, found.axis, found.degrees);
        expect(close(reproduced.right, to.right)).toBe(true);
        expect(close(reproduced.up, to.up)).toBe(true);
        expect(close(reproduced.back, to.back)).toBe(true);
      }
    }
  });

  it("recovers a rotation at exactly 180 degrees, the case a corrective flip produces", () => {
    const axis: Vec = [0, 1 / Math.sqrt(2), 1 / Math.sqrt(2)];
    const to = rotateFrame(FRAME, axis, 180);
    const found = rotationBetweenFrames(FRAME, to);
    expect(found.degrees).toBeCloseTo(180);
    const reproduced = rotateFrame(FRAME, found.axis, found.degrees);
    expect(close(reproduced.right, to.right)).toBe(true);
    expect(close(reproduced.up, to.up)).toBe(true);
    expect(close(reproduced.back, to.back)).toBe(true);
  });
});
