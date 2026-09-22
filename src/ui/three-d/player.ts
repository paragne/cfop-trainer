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
import {
  applyMovePhysical,
  cutPlaneDepths,
  perpendicularFaceNormals,
  surfacePosition,
  turningFaceNormals,
} from "../../lib/physical-cube.ts";
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
      // through. A cap's position (axis * depth) doesn't change as its layer
      // turns — rotating a vector about an axis it's already parallel to
      // leaves it fixed — so one per cut plane, never animated, covers both
      // the moving and stationary side. Gone once the move settles, since at
      // rest the sticker-to-sticker seam is backed by the face's own core.
      const caps: Cap[] = cutPlaneDepths(depths).map((cutDepth) => scene.buildCap(axis, cutDepth));

      // A face whose own 9 stickers are all turning stays coplanar with
      // itself but spins within that plane — its core, backing the whole
      // face, has to spin with it exactly like a real cube's top layer
      // carries its own backing plastic around with it. A fixed, never-
      // rotating core would sit outside the rotated square's corners even
      // though it fully covers the layer at rest. Canceling this animation
      // (with the sticker animations below, once the move finishes) reverts
      // the core to its original, unrotated transform — correct again as
      // soon as the layer's new stickers are back in that same plane.
      const turningFaces = turningFaceNormals(axis, depths);
      running.push(...turningFaces.map((n) => animateSticker(scene.coreOuter(n), axis, 0, angle, duration)));

      // A turning face's rotated-away corner also exposes the untouched
      // faces sharing that same corner — their own core legitimately
      // reaches it too (needed to back their own seams the rest of the
      // time), so it briefly comes down alongside the turning face's.
      const shieldedFaces = turningFaces.length > 0 ? perpendicularFaceNormals(axis) : [];
      shieldedFaces.forEach((n) => scene.hideCore(n));

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
      resort(); // once immediately, so caps paint correctly from the first frame, not just after the first tick
      const interval = setInterval(resort, RESORT_INTERVAL_MS);

      await Promise.all(running.map((a) => a.finished));
      clearInterval(interval);
      running.forEach((a) => a.cancel());
      running = [];
      caps.forEach((cap) => cap.remove());
      shieldedFaces.forEach((n) => scene.showCore(n));
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
