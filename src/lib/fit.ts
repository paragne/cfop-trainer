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

// A shift and a uniform scale of x and y only, applied after the projection,
// in clip space: depth and the perspective itself are untouched.
export type Fit = { scale: number; dx: number; dy: number };

// Centers the cube at rest on the canvas and scales it so that everything a
// turn sweeps through still fits, less `margin`, times `zoom`. Tight, but it
// depends on the view direction, so it is for the locked view.
export function lockedFit(viewProjection: Mat4, margin: number, zoom: number): Fit {
  const project = (points: readonly Vec[]) => points.map((p) => transformPoint(viewProjection, p));
  const rest = project(CORNERS);
  const xs = rest.map((p) => p[0]);
  const ys = rest.map((p) => p[1]);
  const centerX = (Math.max(...xs) + Math.min(...xs)) / 2;
  const centerY = (Math.max(...ys) + Math.min(...ys)) / 2;
  const reach = [...rest, ...project(SWEPT)].map((p) => Math.max(Math.abs(p[0] - centerX), Math.abs(p[1] - centerY)));
  const scale = (zoom * (1 - margin)) / Math.max(...reach);
  return { scale, dx: -scale * centerX, dy: -scale * centerY };
}

// The cube's corners all lie within this sphere, whatever way it is turned.
const CIRCUMRADIUS = HALF * Math.sqrt(3);

// The same fit from the sphere around the cube, which looks the same from
// every side, so an orbit never makes the cube swell, shrink or slide. The
// camera looks at the middle of the cube, so no shift is needed.
export function sphereFit(distance: number, fovY: number, aspect: number, margin: number, zoom: number): Fit {
  const focal = 1 / Math.tan(fovY / 2);
  const reach = (Math.max(focal / aspect, focal) * CIRCUMRADIUS) / Math.sqrt(distance * distance - CIRCUMRADIUS * CIRCUMRADIUS);
  return { scale: (zoom * (1 - margin)) / reach, dx: 0, dy: 0 };
}

export const blendFit = (from: Fit, to: Fit, t: number): Fit => ({
  scale: from.scale + (to.scale - from.scale) * t,
  dx: from.dx + (to.dx - from.dx) * t,
  dy: from.dy + (to.dy - from.dy) * t,
});

// Column-major: the last column's x and y multiply w, which is what makes
// them a shift after the perspective divide.
export const fitMatrix = ({ scale, dx, dy }: Fit): Mat4 => [scale, 0, 0, 0, 0, scale, 0, 0, 0, 0, 1, 0, dx, dy, 0, 1];

export const fittedProjection = (projection: Mat4, view: Mat4, margin: number, zoom: number): Mat4 =>
  multiply(fitMatrix(lockedFit(multiply(projection, view), margin, zoom)), projection);
