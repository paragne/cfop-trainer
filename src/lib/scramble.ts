import { axisOf, FACE_MOVES } from "./face-moves.ts";
import type { Move } from "./notation.ts";

const MIN_LENGTH = 20;
const LENGTH_SPAN = 6;

// Never two moves in a row on one axis: same-face pairs merge or cancel, and
// opposite-face pairs commute, so either would be a shorter scramble in disguise.
// Face moves only, so the centers stay home.
export function scramble(random: () => number): Move[] {
  const length = MIN_LENGTH + Math.floor(random() * LENGTH_SPAN);
  const moves: number[] = [];
  while (moves.length < length) {
    const move = Math.floor(random() * FACE_MOVES.length);
    if (moves.length > 0 && axisOf(move) === axisOf(moves[moves.length - 1])) continue;
    moves.push(move);
  }
  return moves.map((move) => FACE_MOVES[move]);
}
