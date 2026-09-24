import type { Vec } from "./cube.ts";
import { multiply, transformPoint } from "./mat4.ts";
import type { Mat4 } from "./mat4.ts";

const HALF = 1.5;

// The cube's own corners: every cubie sits inside them.
export const CORNERS: readonly Vec[] = [-HALF, HALF].flatMap((x) =>
  [-HALF, HALF].flatMap((y) => [-HALF, HALF].map((z): Vec => [x, y, z])),
);

const EIGHTH = Math.SQRT1_2;

// Where those corners reach mid-turn: a layer turned an eighth of a turn about
// each axis sweeps its corners out to 1.5 * sqrt(2) from that axis, well
// past the cube at rest. A view sized to the cube at rest would cut them off.
export const SWEPT: readonly Vec[] = CORNERS.flatMap((v): Vec[] => [
  [v[0], (v[1] - v[2]) * EIGHTH, (v[1] + v[2]) * EIGHTH],
  [(v[0] + v[2]) * EIGHTH, v[1], (v[2] - v[0]) * EIGHTH],
  [(v[0] - v[1]) * EIGHTH, (v[0] + v[1]) * EIGHTH, v[2]],
]);

// Applied after the projection, in clip space: centers the cube at rest on
// the canvas, and scales it so that everything it sweeps through while turning
// still fits, less `margin`, times `zoom`. A shift and a uniform scale of x
// and y only, so depth and the perspective itself are untouched.
export function fitAdjustment(viewProjection: Mat4, margin: number, zoom: number): Mat4 {
  const project = (points: readonly Vec[]) => points.map((p) => transformPoint(viewProjection, p));
  const rest = project(CORNERS);
  const xs = rest.map((p) => p[0]);
  const ys = rest.map((p) => p[1]);
  const centerX = (Math.max(...xs) + Math.min(...xs)) / 2;
  const centerY = (Math.max(...ys) + Math.min(...ys)) / 2;
  const reach = [...rest, ...project(SWEPT)].map((p) => Math.max(Math.abs(p[0] - centerX), Math.abs(p[1] - centerY)));
  const s = (zoom * (1 - margin)) / Math.max(...reach);
  // Column-major: the last column's x and y multiply w, which is what makes
  // them a shift after the perspective divide.
  return [s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1, 0, -s * centerX, -s * centerY, 0, 1];
}

export const fittedProjection = (projection: Mat4, view: Mat4, margin: number, zoom: number): Mat4 =>
  multiply(fitAdjustment(multiply(projection, view), margin, zoom), projection);
