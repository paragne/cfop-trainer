import { describe, expect, it } from "vitest";
import type { Vec } from "./cube.ts";
import { blendFit, CORNERS, fitMatrix, fittedProjection, sphereFit, SWEPT } from "./fit.ts";
import { lookAt, multiply, perspective, transformPoint } from "./mat4.ts";

const FOV = (35 * Math.PI) / 180;
const RADIUS = 12;
const EYES: readonly Vec[] = [[1, 1, 1], [-1, 1, 1], [0, 3, 1.5]];
function onScreen(direction: Vec, aspect: number, margin: number, zoom: number) {
  const length = Math.hypot(...direction);
  const eye: Vec = [direction[0] / length * RADIUS, direction[1] / length * RADIUS, direction[2] / length * RADIUS];
  const view = lookAt(eye, [0, 0, 0], [0, 1, 0]);
  const projection = fittedProjection(perspective(FOV, aspect, RADIUS - 3, RADIUS + 3), view, margin, zoom);
  const at = (points: readonly Vec[]) => points.map((p) => transformPoint(projection, transformPoint(view, p)));
  return { rest: at(CORNERS), swept: at(SWEPT) };
}

const bounds = (points: readonly Vec[]) => {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
};

const CASES = EYES.flatMap((eye) => [0.5, 1, 1.8].map((aspect) => [eye, aspect] as const));

describe("fittedProjection", () => {
  it.each(CASES)("centers the cube at rest for eye %j at aspect %s", (eye, aspect) => {
    const { minX, maxX, minY, maxY } = bounds(onScreen(eye, aspect, 0.06, 1).rest);
    expect(minX + maxX).toBeCloseTo(0, 9);
    expect(minY + maxY).toBeCloseTo(0, 9);
  });

  it.each(CASES)("fits everything a turn sweeps through, to the margin, for eye %j at aspect %s", (eye, aspect) => {
    const { rest, swept } = onScreen(eye, aspect, 0.06, 1);
    const all = [...rest, ...swept].flatMap((p) => [Math.abs(p[0]), Math.abs(p[1])]);
    expect(Math.max(...all)).toBeCloseTo(0.94, 9);
  });

  it("scales the fitted size by the zoom, staying centered", () => {
    const { rest, swept } = onScreen([1, 1, 1], 1, 0.06, 0.5);
    expect(Math.max(...[...rest, ...swept].flatMap((p) => [Math.abs(p[0]), Math.abs(p[1])]))).toBeCloseTo(0.47, 9);
    const { minX, maxX, minY, maxY } = bounds(rest);
    expect(minX + maxX).toBeCloseTo(0, 9);
    expect(minY + maxY).toBeCloseTo(0, 9);
  });
});

describe("sphereFit", () => {
  // The same size from every side is the point: an orbit must not pulse.
  const reachFrom = (direction: Vec, aspect: number) => {
    const length = Math.hypot(...direction);
    const eye: Vec = [direction[0] / length * RADIUS, direction[1] / length * RADIUS, direction[2] / length * RADIUS];
    const view = lookAt(eye, [0, 0, 0], [0, 1, 0]);
    const projection = perspective(FOV, aspect, RADIUS - 3, RADIUS + 3);
    const shown = multiply(fitMatrix(sphereFit(RADIUS, FOV, aspect, 0.03, 1)), projection);
    const points = [...CORNERS, ...SWEPT].map((p) => transformPoint(shown, transformPoint(view, p)));
    return Math.max(...points.flatMap((p) => [Math.abs(p[0]), Math.abs(p[1])]));
  };

  it.each([0.5, 1, 1.8])("keeps everything a turn sweeps through inside the canvas from any side, at aspect %s", (aspect) => {
    for (const eye of [...EYES, [0.05, 1, 0.05], [1, 0, 0], [0.3, -1, 0.7]] as Vec[]) {
      expect(reachFrom(eye, aspect)).toBeLessThanOrEqual(0.97 + 1e-9);
    }
  });
});

describe("blendFit", () => {
  it("is each end at 0 and 1, and between them in the middle", () => {
    const a = { scale: 1, dx: 0, dy: 2 };
    const b = { scale: 3, dx: 4, dy: 0 };
    expect(blendFit(a, b, 0)).toEqual(a);
    expect(blendFit(a, b, 1)).toEqual(b);
    expect(blendFit(a, b, 0.5)).toEqual({ scale: 2, dx: 2, dy: 1 });
  });
});
