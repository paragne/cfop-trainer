/**
 * Camera state only — no per-move hooks. A locked camera that followed
 * whole-cube rotations would make them visually invisible and silently
 * change which physical layer a later move appears to turn on screen, so
 * locked mode is world-fixed, full stop: a fixed basis, optionally rotated
 * once (at preset load, never mid-playback) by a case's corrective rotation.
 * Free mode is plain user-driven orbit, independent of algorithm playback.
 */
import { MOVE_AXES, quarterTurns, rotate } from "../../lib/cube.ts";
import type { Vec } from "../../lib/cube.ts";
import { screenAxes } from "../../lib/camera-projection.ts";
import { viewMatrix3d } from "../../lib/css-transform.ts";
import type { Move } from "../../lib/notation.ts";

const EYE: Vec = [1, 1, 1];
const DEFAULT_RADIUS = 550;
const PITCH_LIMIT = 85;

export type CameraMode = "locked" | "free";

export type Camera = {
  setMode(mode: CameraMode): void;
  setCorrective(moves: readonly Move[]): void;
  setRadius(radiusPx: number): void;
  attachDrag(el: HTMLElement): void;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Rotates the same three basis vectors a physical sticker's would rotate
// through, via cube.ts's own rotate() — the corrective is always x/y/z
// moves from orientation.ts's homeRotation, which by construction turn
// everything, so there is no layer/depths test to make here.
function rotateBasis(basis: { right: Vec; up: Vec; back: Vec }, moves: readonly Move[]) {
  let { right, up, back } = basis;
  for (const move of moves) {
    const { axis } = MOVE_AXES[move.name];
    for (let q = 0; q < quarterTurns(move); q++) {
      right = rotate(right, axis);
      up = rotate(up, axis);
      back = rotate(back, axis);
    }
  }
  return { right, up, back };
}

// The default view, correctly oriented (screen axes, not raw cube-space
// coordinates). Free-cam orbits outside this — rotateX/rotateY applied
// leftmost, so yaw/pitch drag around the camera's own already-correct
// right/up, rather than around cube-space's y-up axis, which CSS's y-down
// convention would otherwise render upside down.
const DEFAULT_AXES = screenAxes(EYE);
const DEFAULT_VIEW = viewMatrix3d(DEFAULT_AXES.right, DEFAULT_AXES.up, DEFAULT_AXES.back);

export function createCamera(rig: HTMLElement): Camera {
  let mode: CameraMode = "locked";
  let radius = DEFAULT_RADIUS;
  let lockedBasis = screenAxes(EYE);
  let yaw = 0;
  let pitch = 0;

  function apply(): void {
    const rotation =
      mode === "free"
        ? `rotateX(${pitch}deg) rotateY(${yaw}deg) ${DEFAULT_VIEW}`
        : viewMatrix3d(lockedBasis.right, lockedBasis.up, lockedBasis.back);
    rig.style.transform = `translateZ(${-radius}px) ${rotation}`;
  }

  apply();

  return {
    setMode(next) {
      mode = next;
      apply();
    },
    setCorrective(moves) {
      lockedBasis = rotateBasis(screenAxes(EYE), moves);
      apply();
    },
    setRadius(radiusPx) {
      radius = radiusPx;
      apply();
    },
    attachDrag(el) {
      let dragging = false;
      let lastX = 0;
      let lastY = 0;
      el.addEventListener("pointerdown", (e) => {
        if (mode !== "free") return;
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        el.setPointerCapture(e.pointerId);
      });
      el.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        yaw += e.clientX - lastX;
        pitch = clamp(pitch - (e.clientY - lastY), -PITCH_LIMIT, PITCH_LIMIT);
        lastX = e.clientX;
        lastY = e.clientY;
        apply();
      });
      const stop = () => {
        dragging = false;
      };
      el.addEventListener("pointerup", stop);
      el.addEventListener("pointercancel", stop);
    },
  };
}
