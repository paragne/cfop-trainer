/**
 * ?debug-only synchronous single-frame renderer for pixel-check scripts
 * (driver.mjs) that can't pause a real animation at a precise fraction
 * without flakiness. Applies setup instantly, then freezes one move at
 * `fraction` through its animation.
 */
import { MOVE_AXES } from "../../lib/cube.ts";
import type { Vec } from "../../lib/cube.ts";
import { parse } from "../../lib/notation.ts";
import { applyAlgToCubies } from "../../lib/physical-cube.ts";
import type { PhysicalCubie } from "../../lib/physical-cube.ts";
import { homeCubiesWithCore } from "./core-cubie.ts";
import { animationAngleDegrees } from "../../lib/rotate-by-angle.ts";
import { applyCorrectiveForCubies, applyEyeForCase } from "./case-camera.ts";
import type { Camera } from "./camera.ts";
import type { InFlight } from "./player.ts";
import type { Mask } from "../../data/algorithms.ts";

declare global {
  interface Window {
    // Gated behind ?debug so it is inert unless asked for. Renders one
    // deterministic frame — `setupMovesText` applied instantly, then a
    // single `moveText` frozen at `fraction` through its animation, with
    // the given mask applied (omitted: every sticker its true color) — with
    // no timer involved, for pixel verification scripts that cannot pause a
    // real animation at a precise fraction without flakiness.
    __threeD?: {
      renderAt(
        setupMovesText: string,
        moveText: string,
        fraction: number,
        maskKind?: Mask["kind"],
        maskSlot?: "FR" | "FL",
      ): void;
    };
  }
}

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// Built from separate plain-string params (not a JSON-encoded Mask) so a
// caller across the window boundary can't hand this something the Mask
// union doesn't cover without a type-unsafe cast at the parse site.
function maskFor(kind: Mask["kind"] | undefined, slot: "FR" | "FL" | undefined): Mask | null {
  switch (kind) {
    case undefined:
      return null;
    case "f2l":
      if (slot === undefined) throw new Error("renderAt: an f2l mask needs a slot");
      return { kind: "f2l", slot };
    case "oll-edges":
    case "oll-full":
    case "pll-corners":
    case "pll-full":
      return { kind };
  }
}

export function renderAt(
  camera: Camera,
  setMask: (mask: Mask | null) => void,
  // Keeps the player's own state in sync with whatever renderAt just drew:
  // main.ts's continuous render loop reads player.currentFrame() on every
  // rAF, including ones queued by earlier, unrelated onChange() calls (a
  // free-cam drag, an earlier renderAt's own camera change) that can still
  // be pending when this runs. Without this, such a frame can fire right
  // after renderAt draws and repaint over it with the player's last real
  // (and here, unrelated) state — a real, timing-dependent race that showed
  // up as flaky wrong-face reads in driver.mjs's F2L checks.
  snapTo: (cubies: readonly PhysicalCubie[]) => void,
  renderNow: (cubies: readonly PhysicalCubie[], inFlight: InFlight | null) => void,
  setupMovesText: string,
  moveText: string,
  fraction: number,
  // Omitted (every sticker its true color) by the camera/animation-only
  // checks that came first and don't care about masking.
  maskKind?: Mask["kind"],
  maskSlot?: "FR" | "FL",
): void {
  const setupMoves = parse(setupMovesText);
  const move = parse(moveText)[0];
  if (move === undefined) throw new Error("renderAt: moveText parsed to no moves");
  const mask = maskFor(maskKind, maskSlot);
  camera.setMode("locked");
  setMask(mask);
  const before = applyAlgToCubies(homeCubiesWithCore(), setupMoves);
  applyEyeForCase(camera, mask);
  applyCorrectiveForCubies(camera, before, true);
  snapTo(before);
  const { axis, depths } = MOVE_AXES[move.name];
  const movingCubieIndices = new Set(before.flatMap((cubie, i) => (depths.includes(dot(axis, cubie.position)) ? [i] : [])));
  const inFlight: InFlight = { axis, angleDeg: animationAngleDegrees(move) * fraction, movingCubieIndices };
  renderNow(before, inFlight);
}

// Registers window.__threeD when ?debug is present; inert otherwise.
export function installDebugHook(
  camera: Camera,
  setMask: (mask: Mask | null) => void,
  snapTo: (cubies: readonly PhysicalCubie[]) => void,
  renderNow: (cubies: readonly PhysicalCubie[], inFlight: InFlight | null) => void,
): void {
  if (!new URLSearchParams(location.search).has("debug")) return;
  window.__threeD = {
    renderAt: (setupMovesText, moveText, fraction, maskKind, maskSlot) =>
      renderAt(camera, setMask, snapTo, renderNow, setupMovesText, moveText, fraction, maskKind, maskSlot),
  };
}
