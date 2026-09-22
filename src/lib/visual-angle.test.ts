import { describe, expect, it } from "vitest";
import { MOVE_AXES, quarterTurns, rotate } from "./cube.ts";
import type { Vec } from "./cube.ts";
import type { Move } from "./notation.ts";
import { visualAngleDegrees } from "./rotate-by-angle.ts";

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

// Independently built from the CSS Transforms spec's rotate3d() formula
// (the standard axis-angle/Rodrigues matrix for a counterclockwise rotation
// as seen from the tip of axis, the right-hand-rule convention): NOT a call
// to this codebase's own rotateByAngle, which deliberately uses the engine's
// opposite (clockwise-from-tip) sense — reusing it here would just test that
// function against itself.
function cssRotate3d(v: Vec, axis: Vec, angleDeg: number): Vec {
  const len = Math.sqrt(dot(axis, axis));
  const a: Vec = [axis[0] / len, axis[1] / len, axis[2] / len];
  const rad = (angleDeg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const d = dot(a, v);
  const x = cross(a, v);
  return [
    v[0] * c + x[0] * s + a[0] * d * (1 - c),
    v[1] * c + x[1] * s + a[1] * d * (1 - c),
    v[2] * c + x[2] * s + a[2] * d * (1 - c),
  ];
}

// The engine's own rotation for a move: rotate() composed quarterTurns times.
function engineRotate(v: Vec, move: Move): Vec {
  const { axis } = MOVE_AXES[move.name];
  let result = v;
  for (let q = 0; q < quarterTurns(move); q++) result = rotate(result, axis);
  return result;
}

const close = (a: Vec, b: Vec) => a.every((n, i) => Math.abs(n - b[i]) < 1e-9);

const TEST_VECTORS: readonly Vec[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 1, 1],
];

// A representative move for each of: plain quarter, prime quarter, half
// turn, slice, wide, and rotation — the kinds MOVE_AXES has to get right.
const MOVES: readonly Move[] = [
  { name: "U", turns: 1, prime: false },
  { name: "U", turns: 1, prime: true },
  { name: "R", turns: 1, prime: false },
  { name: "R", turns: 1, prime: true },
  { name: "F", turns: 2, prime: false },
  { name: "M", turns: 1, prime: false },
  { name: "r", turns: 1, prime: false },
  { name: "y", turns: 1, prime: false },
];

describe("visualAngleDegrees agrees with the engine's own rotation", () => {
  it.each(MOVES.map((m): [string, Move] => [`${m.name}${m.turns === 2 ? "2" : ""}${m.prime ? "'" : ""}`, m]))(
    "CSS rotate3d(axis, visualAngleDegrees(%s)) equals rotate() composed quarterTurns times",
    (label, move) => {
      const { axis } = MOVE_AXES[move.name];
      const angle = visualAngleDegrees(move);
      for (const v of TEST_VECTORS) {
        const viaCss = cssRotate3d(v, axis, angle);
        const viaEngine = engineRotate(v, move);
        expect(close(viaCss, viaEngine), `${label}: css=${viaCss} engine=${viaEngine} for v=${v}`).toBe(true);
      }
    },
  );
});
