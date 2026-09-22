/**
 * Camera state only — no per-move hooks. A locked camera that followed
 * whole-cube rotations would make them visually invisible and silently
 * change which physical layer a later move appears to turn on screen, so
 * locked mode is world-fixed, full stop: a fixed basis, optionally rotated
 * once (at preset load, never mid-playback) by a case's corrective rotation.
 * Free mode is plain user-driven orbit, independent of algorithm playback.
 *
 * Both modes keep one explicit (right, up, back) world-space basis rather
 * than free mode using CSS rotateX/rotateY: the depth-sorter needs the
 * camera's exact current back vector to sort stickers by, in either mode.
 */
import { MOVE_AXES, quarterTurns, rotate } from "../../lib/cube.ts";
import type { Vec } from "../../lib/cube.ts";
import { screenAxes } from "../../lib/camera-projection.ts";
import { viewMatrix3d } from "../../lib/css-transform.ts";
import { rotateByAngle } from "../../lib/rotate-by-angle.ts";
import type { Move } from "../../lib/notation.ts";

const EYE: Vec = [1, 1, 1];
const WORLD_UP: Vec = [0, 1, 0];
const DEFAULT_RADIUS = 550;
const PITCH_LIMIT = 85;

export type CameraMode = "locked" | "free";
type Basis = { right: Vec; up: Vec; back: Vec };

export type Camera = {
  setMode(mode: CameraMode): void;
  setCorrective(moves: readonly Move[]): void;
  setRadius(radiusPx: number): void;
  attachDrag(el: HTMLElement): void;
  getBack(): Vec;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// Rotates the same three basis vectors a physical sticker's would rotate
// through, via cube.ts's own rotate() — the corrective is always x/y/z
// moves from orientation.ts's homeRotation, which by construction turn
// everything, so there is no layer/depths test to make here.
function rotateBasis(basis: Basis, moves: readonly Move[]): Basis {
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

const DEFAULT_BASIS: Basis = screenAxes(EYE);

export function createCamera(rig: HTMLElement, onChange: () => void): Camera {
  let mode: CameraMode = "locked";
  let radius = DEFAULT_RADIUS;
  let lockedBasis = DEFAULT_BASIS;
  let freeBasis = DEFAULT_BASIS;

  function basis(): Basis {
    return mode === "free" ? freeBasis : lockedBasis;
  }

  function apply(): void {
    const { right, up, back } = basis();
    rig.style.transform = `translateZ(${-radius}px) ${viewMatrix3d(right, up, back)}`;
    onChange();
  }

  // Deferred: the caller wires this camera's onChange to code that reads
  // sticker positions from a player built after this camera (it needs
  // getBack), so nothing can fire before the caller makes its own first
  // setMode/setCorrective/setRadius call once everything exists.
  return {
    setMode(next) {
      mode = next;
      apply();
    },
    setCorrective(moves) {
      lockedBasis = rotateBasis(DEFAULT_BASIS, moves);
      apply();
    },
    setRadius(radiusPx) {
      radius = radiusPx;
      apply();
    },
    getBack() {
      return basis().back;
    },
    attachDrag(el) {
      let dragging = false;
      let lastX = 0;
      let lastY = 0;
      // Degrees pitched from the default, level view — tracked separately
      // from freeBasis so a drag past the limit can be clamped (a per-event
      // delta can't be clamped meaningfully; only the cumulative angle can).
      let pitchAccum = 0;
      el.addEventListener("pointerdown", (e) => {
        if (mode !== "free") return;
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
        el.setPointerCapture(e.pointerId);
      });
      el.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        // Yaw orbits around a fixed world axis (no roll); pitch around the
        // camera's own current right axis, clamped so it cannot flip over
        // the top.
        const { right, up, back } = freeBasis;
        const yawed = {
          right: rotateByAngle(right, WORLD_UP, -dx),
          up: rotateByAngle(up, WORLD_UP, -dx),
          back: rotateByAngle(back, WORLD_UP, -dx),
        };
        const nextPitchAccum = clamp(pitchAccum + dy, -PITCH_LIMIT, PITCH_LIMIT);
        const pitchDelta = nextPitchAccum - pitchAccum;
        pitchAccum = nextPitchAccum;
        freeBasis = {
          right: yawed.right,
          up: rotateByAngle(yawed.up, yawed.right, pitchDelta),
          back: rotateByAngle(yawed.back, yawed.right, pitchDelta),
        };
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
