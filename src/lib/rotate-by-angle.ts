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
