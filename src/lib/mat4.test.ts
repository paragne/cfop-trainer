import { describe, expect, it } from "vitest";
import { rotate } from "./cube.ts";
import type { Vec } from "./cube.ts";
import { fromColumns, identity, lookAt, multiply, perspective, rotationAboutAxis, transformPoint } from "./mat4.ts";

const close = (a: Vec, b: Vec) => a.every((n, i) => Math.abs(n - b[i]) < 1e-9);

describe("identity", () => {
  it("is the identity for transformPoint", () => {
    expect(transformPoint(identity(), [3, -2, 7])).toEqual([3, -2, 7]);
  });
});

describe("multiply", () => {
  it("with identity on either side is a no-op", () => {
    const m = fromColumns([0, 1, 0], [0, 0, 1], [1, 0, 0], [5, -1, 2]);
    expect(multiply(identity(), m)).toEqual(m);
    expect(multiply(m, identity())).toEqual(m);
  });

  it("composes: applying a*b equals applying b then a", () => {
    const a = fromColumns([1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 2, 3]);
    const b = rotationAboutAxis([0, 1, 0], 90);
    const p: Vec = [1, 0, 0];
    expect(close(transformPoint(multiply(a, b), p), transformPoint(a, transformPoint(b, p)))).toBe(true);
  });
});

describe("fromColumns", () => {
  it("places the translation and leaves basis vectors as columns", () => {
    const m = fromColumns([1, 0, 0], [0, 1, 0], [0, 0, 1], [4, 5, 6]);
    expect(transformPoint(m, [0, 0, 0])).toEqual([4, 5, 6]);
    expect(transformPoint(m, [1, 0, 0])).toEqual([5, 5, 6]);
  });
});

describe("rotationAboutAxis", () => {
  it("is the identity at 0 degrees", () => {
    for (const axis of [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as Vec[]) {
      expect(close(transformPoint(rotationAboutAxis(axis, 0), [1, 2, 3]), [1, 2, 3])).toBe(true);
    }
  });

  it("matches cube.ts's quarter-turn rotate() at 90 degrees", () => {
    const vectors: Vec[] = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1], [-1, 1, 0]];
    for (const axis of [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as Vec[]) {
      const m = rotationAboutAxis(axis, 90);
      for (const v of vectors) expect(close(transformPoint(m, v), rotate(v, axis))).toBe(true);
    }
  });

  it("composes: rotating by a then b equals rotating by a + b", () => {
    const axis: Vec = [0, 1, 0];
    const v: Vec = [1, 1, 1];
    const stepped = transformPoint(rotationAboutAxis(axis, 52), transformPoint(rotationAboutAxis(axis, 37), v));
    expect(close(stepped, transformPoint(rotationAboutAxis(axis, 89), v))).toBe(true);
  });
});

describe("perspective", () => {
  it("keeps an on-axis point on-axis", () => {
    const m = perspective(Math.PI / 2, 1, 1, 10);
    const [x, y] = transformPoint(m, [0, 0, -5]);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
  });

  it("maps the near and far planes to clip z -1 and 1", () => {
    const m = perspective(Math.PI / 2, 1, 1, 10);
    expect(transformPoint(m, [0, 0, -1])[2]).toBeCloseTo(-1);
    expect(transformPoint(m, [0, 0, -10])[2]).toBeCloseTo(1);
  });
});

describe("lookAt", () => {
  it("is the identity for a camera at the origin looking down -z with +y up", () => {
    const m = lookAt([0, 0, 0], [0, 0, -1], [0, 1, 0]);
    expect(close(transformPoint(m, [1, 2, 3]), [1, 2, 3])).toBe(true);
  });

  it("puts a point in front of the camera at negative view-space z", () => {
    const m = lookAt([0, 0, 5], [0, 0, 0], [0, 1, 0]);
    expect(transformPoint(m, [0, 0, 0])[2]).toBeLessThan(0);
  });

  // Chirality lock: SPEC.md's yellow-up, green-front, orange-right cube must
  // not come out mirrored. eye=[1,1,1] is the same default direction
  // camera-projection.ts's screenAxes and camera.ts use; a handedness bug in
  // lookAt or perspective would pass every other test here and still mirror
  // the whole rendered picture.
  it("keeps R on screen-right, F on screen-left, U on screen-top from the default eye", () => {
    const view = lookAt([1, 1, 1], [0, 0, 0], [0, 1, 0]);
    const proj = perspective(Math.PI / 3, 1, 0.5, 10);
    const vp = multiply(proj, view);
    const rX = transformPoint(vp, [1.5, 0, 0])[0];
    const fX = transformPoint(vp, [0, 0, 1.5])[0];
    const uY = transformPoint(vp, [0, 1.5, 0])[1];
    expect(rX).toBeGreaterThan(0);
    expect(fX).toBeLessThan(0);
    expect(uY).toBeGreaterThan(0);
  });
});
