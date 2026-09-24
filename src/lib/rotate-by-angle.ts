/**
 * Rotates a vector by an arbitrary angle about an axis, matching cube.ts's
 * rotate()'s convention (clockwise as seen from the tip of axis) at every
 * angle rather than just 90°. cube.ts's own quarter-turn rotate() stays the
 * one the engine and the physical-sticker tracker use — this is for the 3D
 * renderer's own needs: a free-cam orbit's continuous drag angle, and a
 * sticker's true position partway through an animated turn, neither of
 * which is ever a multiple of 90°.
 */
import type { Vec } from "./cube.ts";
import type { Move } from "./notation.ts";

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export function rotateByAngle(v: Vec, axis: Vec, degrees: number): Vec {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const d = dot(axis, v);
  const c = cross(axis, v);
  return [
    v[0] * cos - c[0] * sin + axis[0] * d * (1 - cos),
    v[1] * cos - c[1] * sin + axis[1] * d * (1 - cos),
    v[2] * cos - c[2] * sin + axis[2] * d * (1 - cos),
  ];
}

export type Frame = { right: Vec; up: Vec; back: Vec };

// Finds the single axis and angle that carries `from`'s three orthonormal,
// right-handed vectors onto `to`'s — lets a camera tween its locked basis
// between two corrective orientations instead of snapping, since a snap
// mid-algorithm reads as the view breaking. Extracted via a quaternion
// (Shepperd's method) rather than the simpler cross-product-sum identity,
// which degenerates exactly at a 180° swing — the case a corrective flip
// actually produces.
export function rotationBetweenFrames(from: Frame, to: Frame): { axis: Vec; degrees: number } {
  const pairs: [Vec, Vec][] = [
    [from.right, to.right],
    [from.up, to.up],
    [from.back, to.back],
  ];
  // Transposed (from[i]*to[j], not to[i]*from[j]): rotateByAngle sweeps
  // clockwise as seen from the axis tip, the mirror of the plain math
  // convention the untransposed matrix would extract a quaternion for.
  const r = (i: number, j: number) => pairs.reduce((sum, [f, t]) => sum + f[i] * t[j], 0);
  const trace = r(0, 0) + r(1, 1) + r(2, 2);
  let qw: number;
  let qx: number;
  let qy: number;
  let qz: number;
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    qw = s / 4;
    qx = (r(2, 1) - r(1, 2)) / s;
    qy = (r(0, 2) - r(2, 0)) / s;
    qz = (r(1, 0) - r(0, 1)) / s;
  } else if (r(0, 0) > r(1, 1) && r(0, 0) > r(2, 2)) {
    const s = Math.sqrt(1 + r(0, 0) - r(1, 1) - r(2, 2)) * 2;
    qw = (r(2, 1) - r(1, 2)) / s;
    qx = s / 4;
    qy = (r(0, 1) + r(1, 0)) / s;
    qz = (r(0, 2) + r(2, 0)) / s;
  } else if (r(1, 1) > r(2, 2)) {
    const s = Math.sqrt(1 + r(1, 1) - r(0, 0) - r(2, 2)) * 2;
    qw = (r(0, 2) - r(2, 0)) / s;
    qx = (r(0, 1) + r(1, 0)) / s;
    qy = s / 4;
    qz = (r(1, 2) + r(2, 1)) / s;
  } else {
    const s = Math.sqrt(1 + r(2, 2) - r(0, 0) - r(1, 1)) * 2;
    qw = (r(1, 0) - r(0, 1)) / s;
    qx = (r(0, 2) + r(2, 0)) / s;
    qy = (r(1, 2) + r(2, 1)) / s;
    qz = s / 4;
  }
  const sinHalf = Math.hypot(qx, qy, qz);
  const degrees = (2 * Math.atan2(sinHalf, qw) * 180) / Math.PI;
  const axis: Vec = sinHalf < 1e-9 ? [1, 0, 0] : [qx / sinHalf, qy / sinHalf, qz / sinHalf];
  return { axis, degrees };
}

// The angle to sweep a move's visual animation through, in the engine's own
// clockwise-from-tip-of-axis sense (mat4.ts's rotationAboutAxis and this
// file's own rotateByAngle both use that sense, so this needs no sign flip
// for either). A plain quarter turn animates through +90°: one forward
// rotate(). A prime quarter turn animates through -90°, one turn backward,
// rather than +270° (three forward quarters) — same end state, shorter
// visual sweep. Half turns (180°) have no direction, so the sign doesn't
// matter there.
export function animationAngleDegrees(move: Move): number {
  return move.prime ? -90 : move.turns === 2 ? 180 : 90;
}
