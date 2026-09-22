/**
 * Turns cube-space basis vectors into CSS transform-function strings. The
 * only place either scene.ts (sticker placement) or camera.ts (rig
 * orientation) builds a matrix3d/rotate3d string, so the two always agree
 * on what a basis vector means on screen.
 */
import type { Vec } from "./cube.ts";

// Places a unit plane whose local x/y/z axes are column/row/normal at
// `position` (scaled to pixels). Column-major, as CSS's matrix3d() expects.
export function matrix3d(column: Vec, row: Vec, normal: Vec, position: Vec, scale: number): string {
  const values = [
    ...column, 0,
    ...row, 0,
    ...normal, 0,
    position[0] * scale, position[1] * scale, position[2] * scale, 1,
  ];
  return `matrix3d(${values.join(",")})`;
}

export function rotate3d(axis: Vec, angleDeg: number): string {
  return `rotate3d(${axis[0]},${axis[1]},${axis[2]},${angleDeg}deg)`;
}

// A view matrix: world coordinates to screen coordinates, for a camera whose
// screen axes are right/up and whose back (unit vector, origin toward the
// eye) points out of the screen. This is the transpose of matrix3d's
// column-per-axis placement above — placing an object's axes onto world
// directions and reading world coordinates off camera axes are inverse
// operations — and up is negated because CSS y grows downward.
export function viewMatrix3d(right: Vec, up: Vec, back: Vec): string {
  const values = [
    right[0], -up[0], back[0], 0,
    right[1], -up[1], back[1], 0,
    right[2], -up[2], back[2], 0,
    0, 0, 0, 1,
  ];
  return `matrix3d(${values.join(",")})`;
}
