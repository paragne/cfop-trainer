import { describe, expect, it } from "vitest";
import { MOVE_AXES, quarterTurns, rotate } from "./cube.ts";
import type { Vec } from "./cube.ts";
import type { Move } from "./notation.ts";
import { animationAngleDegrees } from "./rotate-by-angle.ts";
import { rotationAboutAxis, transformPoint } from "./mat4.ts";

const close = (a: Vec, b: Vec) => a.every((n, i) => Math.abs(n - b[i]) < 1e-9);

// The engine's own rotation for a move: rotate() composed quarterTurns times.
function engineRotate(v: Vec, move: Move): Vec {
  const { axis } = MOVE_AXES[move.name];
  let result = v;
  for (let q = 0; q < quarterTurns(move); q++) result = rotate(result, axis);
  return result;
}

const TEST_VECTORS: readonly Vec[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 1, 1],
];

// A representative move for each of: plain quarter, prime quarter, half
// turn, slice, wide, and rotation — the kinds MOVE_AXES has to get right,
// and the same set visual-angle.test.ts (this file's predecessor, deleted
// with the CSS renderer) used.
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

describe("animationAngleDegrees agrees with the engine's own rotation", () => {
  it.each(MOVES.map((m): [string, Move] => [`${m.name}${m.turns === 2 ? "2" : ""}${m.prime ? "'" : ""}`, m]))(
    "mat4.rotationAboutAxis(axis, animationAngleDegrees(%s)) equals rotate() composed quarterTurns times",
    (label, move) => {
      const { axis } = MOVE_AXES[move.name];
      const angle = animationAngleDegrees(move);
      const m = rotationAboutAxis(axis, angle);
      for (const v of TEST_VECTORS) {
        const viaMat4 = transformPoint(m, v);
        const viaEngine = engineRotate(v, move);
        expect(close(viaMat4, viaEngine), `${label}: mat4=${viaMat4} engine=${viaEngine} for v=${v}`).toBe(true);
      }
    },
  );
});
