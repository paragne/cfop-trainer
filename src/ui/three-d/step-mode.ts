/**
 * Step-through state for a loaded case's algorithm: which move index is
 * current, and forward/backward stepping. At most one request is ever
 * outstanding: a request while a move is already animating replaces
 * whatever was pending (only the latest survives) instead of touching the
 * player, and runs automatically once the current move settles — so
 * spamming Prev/Next can't overlap two animations on the same player.
 * Wraps the existing Player rather than re-animating.
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

type Direction = "forward" | "backward";

// `onSettled` fires once per committed index change (on load and after
// each completed step), so the algorithm display only updates when a move
// actually finishes, not when it's merely requested or queued.
export function createStepMode(player: Player, onSettled: () => void): StepMode {
  let moves: readonly Move[] = [];
  let index = 0;
  let animating = false;
  let pending: Direction | null = null;

  function runStep(direction: Direction): void {
    if (direction === "forward" ? index >= moves.length : index <= 0) return;
    const move = direction === "forward" ? moves[index] : invert([moves[index - 1]])[0];
    animating = true;
    void player.play([move]).then(() => {
      index = direction === "forward" ? index + 1 : index - 1;
      animating = false;
      onSettled();
      if (pending !== null) {
        const next = pending;
        pending = null;
        runStep(next);
      }
    });
  }

  function requestStep(direction: Direction): void {
    if (animating) {
      pending = direction;
      return;
    }
    runStep(direction);
  }

  return {
    load(next) {
      moves = next;
      index = 0;
      animating = false;
      pending = null;
      onSettled();
    },
    stepForward: () => requestStep("forward"),
    stepBackward: () => requestStep("backward"),
    currentIndex: () => index,
    moves: () => moves,
  };
}
