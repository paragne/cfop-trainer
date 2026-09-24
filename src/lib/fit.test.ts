import { describe, expect, it } from "vitest";
import type { Vec } from "./cube.ts";
import { CORNERS, fittedProjection, SWEPT } from "./fit.ts";
import { lookAt, perspective, transformPoint } from "./mat4.ts";

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
