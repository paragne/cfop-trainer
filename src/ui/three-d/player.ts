/**
 * Sequences a parsed algorithm as animated layer turns, one move at a time.
 * The visual animation takes the shortest angle around; the logical state
 * advances by composing rotate() the same number of quarters applyMoves
 * would, via applyMovePhysical — a −90° turn and three forward 90° turns are
 * the same rotation, so the two always end up agreeing.
 */
import { MOVE_AXES } from "../../lib/cube.ts";
import type { Vec } from "../../lib/cube.ts";
import { applyMovePhysical } from "../../lib/physical-cube.ts";
import type { PhysicalSticker } from "../../lib/physical-cube.ts";
import type { Move } from "../../lib/notation.ts";
import { animateSticker, setBaseTransform } from "./scene.ts";
import type { SceneSticker } from "./scene.ts";

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export type Player = {
  readonly stickers: readonly PhysicalSticker[];
  snapTo(next: readonly PhysicalSticker[]): void;
  play(moves: readonly Move[]): Promise<void>;
  pause(): void;
  resume(): void;
};

export function createPlayer(scene: readonly SceneSticker[], getDurationMs: () => number): Player {
  let stickers: PhysicalSticker[] = [];
  let running: Animation[] = [];

  function bakeAll(): void {
    stickers.forEach((s, i) => setBaseTransform(scene[i].outer, s));
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
      running = stickers.flatMap((sticker, i) =>
        depths.includes(dot(axis, sticker.position))
          ? [animateSticker(scene[i].outer, axis, 0, angle, duration)]
          : [],
      );
      await Promise.all(running.map((a) => a.finished));
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
