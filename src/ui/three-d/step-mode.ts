/**
 * Step-through state for a loaded case's algorithm: which move index is
 * current, and forward/backward stepping that completes an in-flight move
 * instantly (Player.skipToEnd) before starting the next, so fast tapping
 * never lags behind. Wraps the existing Player rather than re-animating.
 */
import { invert } from "../../lib/notation.ts";
import type { Move } from "../../lib/notation.ts";
import type { Player } from "./player.ts";

export type StepMode = {
  load(moves: readonly Move[]): void;
  stepForward(): void;
  stepBackward(): void;
  currentIndex(): number;
  moves(): readonly Move[];
};

export function createStepMode(player: Player): StepMode {
  let moves: readonly Move[] = [];
  let index = 0;

  return {
    load(next) {
      moves = next;
      index = 0;
    },
    stepForward() {
      if (index >= moves.length) return;
      player.skipToEnd();
      const move = moves[index];
      index++;
      void player.play([move]);
    },
    stepBackward() {
      if (index <= 0) return;
      player.skipToEnd();
      index--;
      void player.play(invert([moves[index]]));
    },
    currentIndex() {
      return index;
    },
    moves() {
      return moves;
    },
  };
}
