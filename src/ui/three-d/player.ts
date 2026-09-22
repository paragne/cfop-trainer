/**
 * Sequences a parsed algorithm as animated layer turns, one move at a time.
 * The visual animation takes the shortest angle around; the logical state
 * advances by composing rotate() the same number of quarters applyMoves
 * would, via applyMovePhysical — a −90° turn and three forward 90° turns are
 * the same rotation, so the two always end up agreeing.
 *
 * Paint order is re-sorted every animation frame while a move plays, using
 * each moving sticker's true current angle (the animation's own eased
 * progress, not a linear guess) — a rotating layer's depth relative to the
 * stationary stickers changes continuously, not just at the start and end.
 */
import { MOVE_AXES } from "../../lib/cube.ts";
import type { Vec } from "../../lib/cube.ts";
import { applyMovePhysical } from "../../lib/physical-cube.ts";
import type { PhysicalSticker } from "../../lib/physical-cube.ts";
import { rotateByAngle } from "../../lib/rotate-by-angle.ts";
import type { Move } from "../../lib/notation.ts";
import { animateSticker, setBaseTransform } from "./scene.ts";
import type { Scene } from "./scene.ts";

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export type Player = {
  readonly stickers: readonly PhysicalSticker[];
  snapTo(next: readonly PhysicalSticker[]): void;
  play(moves: readonly Move[]): Promise<void>;
  pause(): void;
  resume(): void;
};

export function createPlayer(scene: Scene, getBack: () => Vec, getDurationMs: () => number): Player {
  let stickers: PhysicalSticker[] = [];
  let running: Animation[] = [];

  function bakeAll(): void {
    stickers.forEach((s, i) => setBaseTransform(scene.stickers[i].outer, s));
    scene.reorderForPaint(stickers.map((s) => s.position), getBack());
  }

  function snapTo(next: readonly PhysicalSticker[]): void {
    running.forEach((a) => a.cancel());
    running = [];
    stickers = [...next];
    bakeAll();
  }

  async function play(moves: readonly Move[]): Promise<void> {
    for (const move of moves) {
      const { axis, depths } = MOVE_AXES[move.name];
      const angle = move.prime ? -90 : move.turns === 2 ? 180 : 90;
      const duration = getDurationMs();
      const movingIndices = stickers
        .map((_, i) => i)
        .filter((i) => depths.includes(dot(axis, stickers[i].position)));
      running = movingIndices.map((i) => animateSticker(scene.stickers[i].outer, axis, 0, angle, duration));

      let frame: number;
      const resortEachFrame = (): void => {
        const progress = running[0]?.effect?.getComputedTiming().progress;
        const currentAngle = angle * (typeof progress === "number" ? progress : 1);
        const movingSet = new Set(movingIndices);
        const positions = stickers.map((s, i) =>
          movingSet.has(i) ? rotateByAngle(s.position, axis, currentAngle) : s.position,
        );
        scene.reorderForPaint(positions, getBack());
        if (running.some((a) => a.playState === "running")) frame = requestAnimationFrame(resortEachFrame);
      };
      frame = requestAnimationFrame(resortEachFrame);

      await Promise.all(running.map((a) => a.finished));
      cancelAnimationFrame(frame);
      running.forEach((a) => a.cancel());
      running = [];
      stickers = applyMovePhysical(stickers, move);
      bakeAll();
    }
  }

  function pause(): void {
    running.forEach((a) => a.pause());
  }

  function resume(): void {
    running.forEach((a) => a.play());
  }

  return {
    get stickers() {
      return stickers;
    },
    snapTo,
    play,
    pause,
    resume,
  };
}
