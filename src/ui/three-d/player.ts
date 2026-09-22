/**
 * Sequences a parsed algorithm as animated layer turns, one move at a time.
 * The visual animation takes the shortest angle around; the logical state
 * advances by composing rotate() the same number of quarters applyMoves
 * would, via applyMovePhysical — a −90° turn and three forward 90° turns are
 * the same rotation, so the two always end up agreeing.
 *
 * Paint order is re-sorted a few times a second while a move plays, using
 * each moving sticker's true current angle (the animation's own eased
 * progress, not a linear guess) — a rotating layer's depth relative to the
 * stationary stickers changes continuously, not just at the start and end.
 * Every animation frame (60/s) was too often: reordering up to 54 elements
 * that often visibly starved the browser's ability to paint the animation
 * itself, so the CSS animation looked stalled even though it was running.
 */
import { MOVE_AXES } from "../../lib/cube.ts";
import type { Vec } from "../../lib/cube.ts";
import { applyMovePhysical, cutPlaneDepths, surfacePosition } from "../../lib/physical-cube.ts";
import type { PhysicalSticker } from "../../lib/physical-cube.ts";
import { rotateByAngle, visualAngleDegrees } from "../../lib/rotate-by-angle.ts";
import type { Move } from "../../lib/notation.ts";
import { animateSticker, setBaseTransform } from "./scene.ts";
import type { Cap, Scene } from "./scene.ts";

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
    scene.reorderForPaint(stickers.map(surfacePosition), getBack());
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
      const angle = visualAngleDegrees(move);
      const duration = getDurationMs();
      const movingIndices = stickers
        .map((_, i) => i)
        .filter((i) => depths.includes(dot(axis, stickers[i].position)));
      running = movingIndices.map((i) => animateSticker(scene.stickers[i].outer, axis, 0, angle, duration));

      // Cut-plane caps: black plates filling the wedge that opens between a
      // turning layer and the rest as it swings away from it — a real cube
      // shows plastic there; without a cap, the page background shows
      // through. One cap per cut plane rotates with the turning layer, the
      // other stays; both are gone once the move settles, since at rest the
      // ordinary sticker-to-sticker seam (backing plates) is all there is.
      const caps: Cap[] = cutPlaneDepths(depths).flatMap((cutDepth) => {
        const moving = scene.buildCap(axis, cutDepth);
        const stationary = scene.buildCap(axis, cutDepth);
        running.push(animateSticker(moving.outer, axis, 0, angle, duration));
        return [moving, stationary];
      });

      const RESORT_INTERVAL_MS = 120;
      const resort = (): void => {
        const progress = running[0]?.effect?.getComputedTiming().progress;
        const currentAngle = angle * (typeof progress === "number" ? progress : 1);
        const movingSet = new Set(movingIndices);
        const positions = stickers.map((s, i) => {
          const surface = surfacePosition(s);
          return movingSet.has(i) ? rotateByAngle(surface, axis, currentAngle) : surface;
        });
        scene.reorderForPaint(positions, getBack());
      };
      const interval = setInterval(resort, RESORT_INTERVAL_MS);

      await Promise.all(running.map((a) => a.finished));
      clearInterval(interval);
      running.forEach((a) => a.cancel());
      running = [];
      caps.forEach((cap) => cap.outer.remove());
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
