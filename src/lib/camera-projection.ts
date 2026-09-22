/**
 * Pure camera-space geometry for the 3D animator's world-fixed camera: given
 * a fixed eye direction, which way is screen-right and screen-up.
 */
import type { Vec } from "./cube.ts";

const WORLD_UP: Vec = [0, 1, 0];

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

const scale = (v: Vec, k: number): Vec => [v[0] * k, v[1] * k, v[2] * k];

const normalize = (v: Vec): Vec => scale(v, 1 / Math.sqrt(dot(v, v)));

// Isometric default: eye = [1,1,1] gives right ∝ [1,0,-1], the same
// screen-x = x − z formula render.ts's isometric view already uses.
export function screenAxes(eye: Vec): { right: Vec; up: Vec } {
  const back = normalize(eye);
  const right = normalize(cross(WORLD_UP, back));
  const up = cross(back, right);
  return { right, up };
}
