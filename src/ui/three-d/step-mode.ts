/**
 * Step-through state for a loaded case's algorithm: which boundary between
 * moves the cube is at (0 is before the first move, moves.length after the
 * last), and forward/backward stepping. At most one request is ever
 * outstanding: a request while a move is already animating replaces
 * whatever was pending (only the latest survives) instead of touching the
 * player, and runs automatically once the current move settles — so
 * spamming Prev/Next can't overlap two animations on the same player.
 * Wraps the existing Player rather than re-animating.
 *
 * Jumping to the start or the end skips the animation and snaps the cube there.
 *
 * Stepping past either end goes full circle: forward from the end replays the
 * whole algorithm backward, and back from the start replays it forward, both
 * at a fixed fast pace that ignores the speed setting.
 */
import { invert } from "../../lib/notation.ts";
import type { Move } from "../../lib/notation.ts";
import { applyAlgToCubies } from "../../lib/physical-cube.ts";
import type { Player } from "./player.ts";

export const FAST_MOVE_MS = 60;

export type StepEvents = {
  // Fires once per committed boundary change (on load and after each
  // completed step), so a display only settles when a move actually finishes.
  onSettled: () => void;
  // Where the cube is between boundaries, on every frame of a step: a
  // fraction while a move turns, so a display can travel with it.
  onProgress?: (boundary: number) => void;
  // One move's duration at the current speed.
  durationMs: () => number;
};

export type StepMode = {
  load(moves: readonly Move[]): void;
  stepForward(): void;
  stepBackward(): void;
  goToStart(): void;
  goToEnd(): void;
  // From the start, steps forward move after move until the end, unless a
  // step of the user's own interrupts it.
  playAll(): void;
  boundary(): number;
  moves(): readonly Move[];
};

type Direction = "forward" | "backward" | "start" | "end";

export function createStepMode(player: Player, { onSettled, onProgress, durationMs }: StepEvents): StepMode {
  let moves: readonly Move[] = [];
  let index = 0;
  let animating = false;
  let auto = false;
  let pending: Direction | null = null;

  // Snaps rather than animates, so the state has to be computed here: the
  // player is at rest, since a request made mid-move waits in `pending`.
  function jump(direction: "start" | "end"): void {
    const toEnd = direction === "end";
    const remaining = toEnd ? moves.slice(index) : invert(moves.slice(0, index));
    player.snapTo(applyAlgToCubies(player.currentFrame().cubies, remaining));
    index = toEnd ? moves.length : 0;
    auto = false;
    onSettled();
  }

  function runStep(direction: Direction): void {
    if (moves.length === 0) return;
    if (direction === "start" || direction === "end") {
      jump(direction);
      return;
    }
    const forward = direction === "forward";
    const wraps = forward ? index >= moves.length : index <= 0;
    const target = wraps ? (forward ? 0 : moves.length) : index + (forward ? 1 : -1);
    let sequence: readonly Move[];
    if (wraps) sequence = forward ? invert(moves) : moves;
    else sequence = forward ? [moves[index]] : invert([moves[index - 1]]);
    const each = wraps ? FAST_MOVE_MS : durationMs();
    animating = true;
    // Wrapping runs the other way through the algorithm.
    const heading = wraps === forward ? -1 : 1;
    const from = index;
    void player.play(sequence, each, (k, fraction) => onProgress?.(from + heading * (k + fraction))).then(() => {
      index = target;
      animating = false;
      onSettled();
      if (pending !== null) {
        const next = pending;
        pending = null;
        runStep(next);
      } else if (auto && index < moves.length) runStep("forward");
      else auto = false;
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
      auto = false;
      pending = null;
      onSettled();
    },
    stepForward() {
      auto = false;
      requestStep("forward");
    },
    stepBackward() {
      auto = false;
      requestStep("backward");
    },
    goToStart() {
      auto = false;
      requestStep("start");
    },
    goToEnd() {
      auto = false;
      requestStep("end");
    },
    playAll() {
      auto = true;
      requestStep("forward");
    },
    boundary: () => index,
    moves: () => moves,
  };
}
