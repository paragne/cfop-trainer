import { MOVE_AXES, quarterTurns, rotate } from "../../lib/cube.ts";
import type { Move } from "../../lib/notation.ts";
import type { Basis } from "./basis-transition.ts";

// Rotates the same three basis vectors a physical sticker's would rotate
// through, via cube.ts's own rotate() — the corrective is always x/y/z
// moves from orientation.ts's homeRotation, which by construction turn
// everything, so there is no layer/depths test to make here.
export function rotateBasis(basis: Basis, moves: readonly Move[]): Basis {
  let { right, up, back } = basis;
  for (const move of moves) {
    const { axis } = MOVE_AXES[move.name];
    for (let q = 0; q < quarterTurns(move); q++) {
      right = rotate(right, axis);
      up = rotate(up, axis);
      back = rotate(back, axis);
    }
  }
  return { right, up, back };
}
