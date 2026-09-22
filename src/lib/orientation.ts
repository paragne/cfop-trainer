/**
 * The physical twin of cube.ts's normalize(): normalize() fixes a cube with
 * displaced centers by relabeling, which is correct for the flat SVG
 * renderer but not for a physical model — a solver can't recolor a sticker,
 * only rotate the cube. This finds the real whole-cube rotation that
 * achieves the same picture.
 */
import { applyMoves } from "./cube.ts";
import type { Cube } from "./cube.ts";
import type { Move } from "./notation.ts";

const X: Move = { name: "x", turns: 1, prime: false };
const XI: Move = { name: "x", turns: 1, prime: true };
const Z: Move = { name: "z", turns: 1, prime: false };
const ZI: Move = { name: "z", turns: 1, prime: true };
const Y: Move = { name: "y", turns: 1, prime: false };
const YI: Move = { name: "y", turns: 1, prime: true };

// Six ways to bring some face to the top, then four ways to spin what's now
// front: 24 combinations, one for every orientation of the cube.
const TO_TOP: readonly Move[][] = [[], [X], [X, X], [XI], [Z], [ZI]];
const TO_FRONT: readonly Move[][] = [[], [Y], [Y, Y], [YI]];

// U's and F's centers, per the facelet index order documented in SPEC.md.
const U_CENTER = 4;
const F_CENTER = 22;

// The rotation normalize() achieves by relabeling instead. Both produce the
// same picture; only this one is a move a solver could physically make.
export function homeRotation(cube: Cube): Move[] {
  for (const top of TO_TOP) {
    for (const front of TO_FRONT) {
      const moves = [...top, ...front];
      const rotated = applyMoves(cube, moves);
      if (rotated[U_CENTER] === "U" && rotated[F_CENTER] === "F") return moves;
    }
  }
  throw new Error("No orientation brings U and F home");
}
