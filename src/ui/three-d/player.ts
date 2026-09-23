/**
 * Sequences a parsed algorithm as animated layer turns, one move at a time.
 * Owns only timing and progress — never DOM or GL. `currentFrame()` is a
 * pure snapshot the render loop reads on demand; nothing here draws.
 *
 * The visual animation takes the shortest angle around (animationAngleDegrees),
 * while the logical state advances by composing rotate() quarterTurns times
 * via applyMoveToCubies — a -90° turn and three forward 90° turns are the
 * same rotation, so the two always end up agreeing (proved in
 * cubie-model.test.ts, which checks the animated frame at 100% progress
 * against the baked state).
 */
import { MOVE_AXES } from "../../lib/cube.ts";
import type { Vec } from "../../lib/cube.ts";
import { animationAngleDegrees } from "../../lib/rotate-by-angle.ts";
import { applyMoveToCubies } from "../../lib/physical-cube.ts";
import type { PhysicalCubie } from "../../lib/physical-cube.ts";
import type { Move } from "../../lib/notation.ts";

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// The speed slider's value is a ×speed multiplier, not a duration: doubling
// it halves the animation time. BASE_DURATION_MS is the duration at 1×,
// matching the old fixed-duration default.
const BASE_DURATION_MS = 400;
export function speedToDurationMs(speed: number): number {
  return BASE_DURATION_MS / speed;
}

export type InFlight = { readonly axis: Vec; readonly angleDeg: number; readonly movingCubieIndices: ReadonlySet<number> };
export type PlayerFrame = { readonly cubies: readonly PhysicalCubie[]; readonly inFlight: InFlight | null };

export type Player = {
  snapTo(next: readonly PhysicalCubie[]): void;
  play(moves: readonly Move[]): Promise<void>;
  pause(): void;
  resume(): void;
  // Finishes an in-flight move instantly (its `play()` await still resolves
  // and applies the move normally) rather than waiting out the duration, so
  // step mode can advance immediately on a second tap instead of queuing.
  skipToEnd(): void;
  currentFrame(): PlayerFrame;
};

type CurrentMove = {
  readonly axis: Vec;
  readonly angle: number;
  readonly duration: number;
  readonly movingCubieIndices: ReadonlySet<number>;
  readonly resolve: () => void;
};

// `onFrame` marks the render loop's dirty flag once per animation tick;
// nothing here calls into gl-scene or the DOM directly.
export function createPlayer(getDurationMs: () => number, onFrame: () => void): Player {
  let cubies: PhysicalCubie[] = [];
  let inFlight: InFlight | null = null;
  let rafId: number | null = null;
  let elapsed = 0;
  let lastTimestamp: number | null = null;
  let currentMove: CurrentMove | null = null;

  function stopLoop(): void {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function snapTo(next: readonly PhysicalCubie[]): void {
    stopLoop();
    currentMove = null;
    inFlight = null;
    cubies = [...next];
    onFrame();
  }

  // Shared by tick() reaching 100% and skipToEnd() forcing it: clears the
  // pending move and resolves its promise, letting play()'s own continuation
  // (not this function) apply the move to `cubies` and clear `inFlight`.
  function completeCurrentMove(): void {
    if (currentMove === null) return;
    const { resolve } = currentMove;
    currentMove = null;
    stopLoop();
    resolve();
  }

  function tick(now: number): void {
    if (currentMove === null) return;
    if (lastTimestamp !== null) elapsed += now - lastTimestamp;
    lastTimestamp = now;
    const progress = Math.min(1, elapsed / currentMove.duration);
    inFlight = { axis: currentMove.axis, angleDeg: currentMove.angle * progress, movingCubieIndices: currentMove.movingCubieIndices };
    onFrame();
    if (progress >= 1) {
      completeCurrentMove();
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  async function play(moves: readonly Move[]): Promise<void> {
    for (const move of moves) {
      const { axis, depths } = MOVE_AXES[move.name];
      const movingCubieIndices: ReadonlySet<number> = new Set(
        cubies.flatMap((cubie, i) => (depths.includes(dot(axis, cubie.position)) ? [i] : [])),
      );
      await new Promise<void>((resolve) => {
        elapsed = 0;
        lastTimestamp = null;
        currentMove = { axis, angle: animationAngleDegrees(move), duration: getDurationMs(), movingCubieIndices, resolve };
        rafId = requestAnimationFrame(tick);
      });
      cubies = applyMoveToCubies(cubies, move);
      inFlight = null;
      onFrame();
    }
  }

  function pause(): void {
    stopLoop();
  }

  function resume(): void {
    if (currentMove === null || rafId !== null) return;
    lastTimestamp = null; // don't count the paused gap as elapsed
    rafId = requestAnimationFrame(tick);
  }

  return {
    snapTo,
    play,
    pause,
    resume,
    skipToEnd: completeCurrentMove,
    currentFrame() {
      return { cubies, inFlight };
    },
  };
}
