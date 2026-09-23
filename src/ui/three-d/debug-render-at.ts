/**
 * ?debug-only synchronous single-frame renderer for pixel-check scripts
 * (driver.mjs) that can't pause a real animation at a precise fraction
 * without flakiness. Applies setup instantly, then freezes one move at
 * `fraction` through its animation.
 */
import { applyMoves, MOVE_AXES, SOLVED } from "../../lib/cube.ts";
import type { Vec } from "../../lib/cube.ts";
import { parse } from "../../lib/notation.ts";
import { applyAlgToCubies } from "../../lib/physical-cube.ts";
import type { PhysicalCubie } from "../../lib/physical-cube.ts";
import { homeCubiesWithCore } from "./core-cubie.ts";
import { homeRotation } from "../../lib/orientation.ts";
import { animationAngleDegrees } from "../../lib/rotate-by-angle.ts";
import type { Camera } from "./camera.ts";
import type { InFlight } from "./player.ts";

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function renderAt(
  camera: Camera,
  renderNow: (cubies: readonly PhysicalCubie[], inFlight: InFlight | null) => void,
  setupMovesText: string,
  moveText: string,
  fraction: number,
): void {
  const setupMoves = parse(setupMovesText);
  const move = parse(moveText)[0];
  if (move === undefined) throw new Error("renderAt: moveText parsed to no moves");
  camera.setMode("locked");
  camera.setCorrective(homeRotation(applyMoves(SOLVED, setupMoves)));
  const before = applyAlgToCubies(homeCubiesWithCore(), setupMoves);
  const { axis, depths } = MOVE_AXES[move.name];
  const movingCubieIndices = new Set(before.flatMap((cubie, i) => (depths.includes(dot(axis, cubie.position)) ? [i] : [])));
  const inFlight: InFlight = { axis, angleDeg: animationAngleDegrees(move) * fraction, movingCubieIndices };
  renderNow(before, inFlight);
}
