import { parse, stringify } from "../../lib/notation.ts";
import type { Move } from "../../lib/notation.ts";
import { applyAlgToCubies, colorsAtCubies, homeCubies } from "../../lib/physical-cube.ts";
import type { PhysicalCubie } from "../../lib/physical-cube.ts";
import type { Player } from "./player.ts";
import { createStepMode } from "./step-mode.ts";

export const SLOW = 400;

// A player whose moves finish when the test says so, so a step can be caught
// mid-animation.
function fakePlayer() {
  const played: { moves: string; ms: number | undefined }[] = [];
  const finishers: (() => void)[] = [];
  const reporters: ((index: number, fraction: number) => void)[] = [];
  let rest: readonly PhysicalCubie[] = homeCubies();
  const player: Player = {
    snapTo: (next) => {
      rest = next;
    },
    pause: () => {},
    resume: () => {},
    currentFrame: () => ({ cubies: rest, inFlight: null }),
    play(moves: readonly Move[], ms?: number, onProgress?: (index: number, fraction: number) => void) {
      played.push({ moves: stringify(moves), ms });
      if (onProgress !== undefined) reporters.push(onProgress);
      return new Promise<void>((resolve) =>
        finishers.push(() => {
          rest = applyAlgToCubies(rest, moves);
          resolve();
        }),
      );
    },
  };
  const finish = async () => {
    finishers.shift()?.();
    await Promise.resolve();
    await Promise.resolve();
  };
  // Reports that move `index` of the latest play is `fraction` of the way turned.
  const turn = (index: number, fraction: number) => reporters[reporters.length - 1]?.(index, fraction);
  return { player, played, finish, turn, resting: () => colorsAtCubies(rest) };
}

export function setup(alg = "R U R'") {
  const fake = fakePlayer();
  const positions: number[] = [];
  let settled = 0;
  const mode = createStepMode(fake.player, {
    onSettled: () => settled++,
    onProgress: (boundary) => positions.push(boundary),
    durationMs: () => SLOW,
  });
  mode.load(parse(alg));
  return { ...fake, mode, positions, settled: () => settled };
}

