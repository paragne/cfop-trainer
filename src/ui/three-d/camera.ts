/**
 * Camera state only — no per-move hooks. A locked camera that followed
 * whole-cube rotations would make them visually invisible and silently
 * change which physical layer a later move appears to turn on screen, so
 * locked mode is world-fixed, full stop: a fixed basis, optionally rotated
 * once (at preset load, never mid-playback) by a case's corrective rotation.
 * Free mode is plain user-driven orbit, independent of algorithm playback.
 *
 * `onChange` marks the render loop's dirty flag; it does not draw anything
 * itself. Radius is in cube.ts's own world units now (the cube spans
 * roughly ±1.5), not CSS pixels — there is no separate pixel scale once a
 * projection matrix does that job.
 */
import { MOVE_AXES, quarterTurns, rotate } from "../../lib/cube.ts";
import type { Vec } from "../../lib/cube.ts";
import { screenAxes } from "../../lib/camera-projection.ts";
import { rotateByAngle } from "../../lib/rotate-by-angle.ts";
import type { Move } from "../../lib/notation.ts";

const EYE: Vec = [1, 1, 1];
const WORLD_UP: Vec = [0, 1, 0];
const DEFAULT_RADIUS = 12;
const PITCH_LIMIT = 85;

export type CameraMode = "locked" | "free";
type Basis = { right: Vec; up: Vec; back: Vec };

export type Camera = {
  setMode(mode: CameraMode): void;
  setCorrective(moves: readonly Move[]): void;
  // Sets the locked basis directly from an eye direction (e.g. mirrored
  // across x for an FL case, so the L face is on screen instead of R),
  // bypassing setCorrective's fixed [1,1,1]-eye rotation composition.
  setEyeDirection(eye: Vec): void;
  // Where the camera looks, world space (default the origin). Independent
  // of the eye: changing it reframes the view without moving the eye.
  setTarget(point: Vec): void;
  setRadius(radius: number): void;
  attachDrag(el: HTMLElement): void;
  getEye(): Vec;
  getUp(): Vec;
  getRadius(): number;
  getTarget(): Vec;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const scale = (v: Vec, k: number): Vec => [v[0] * k, v[1] * k, v[2] * k];

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

export function createCamera(onChange: () => void): Camera {
  let mode: CameraMode = "locked";
  let radius = DEFAULT_RADIUS;
  let target: Vec = [0, 0, 0];
  let lockedBasis = DEFAULT_BASIS;
  let freeBasis = DEFAULT_BASIS;
  // Degrees pitched from the default, level view — tracked separately from
  // freeBasis so a drag past the limit can be clamped (a per-event delta
  // can't be clamped meaningfully; only the cumulative angle can). Lives
  // here, not inside attachDrag, so setMode can reset it alongside freeBasis.
  let pitchAccum = 0;

  function basis(): Basis {
    return mode === "free" ? freeBasis : lockedBasis;
  }

  return {
    setMode(next) {
      // Free cam always re-enters at the current fixed angle rather than
      // resuming wherever a previous drag left it.
      if (next === "free") {
        freeBasis = lockedBasis;
        pitchAccum = 0;
      }
      mode = next;
      onChange();
    },
    setCorrective(moves) {
      lockedBasis = rotateBasis(DEFAULT_BASIS, moves);
      onChange();
    },
    setEyeDirection(eye) {
      lockedBasis = screenAxes(eye);
      onChange();
    },
    setTarget(point) {
      target = point;
      onChange();
    },
    setRadius(next) {
      radius = next;
      onChange();
    },
    getEye() {
      return scale(basis().back, radius);
    },
    getUp() {
      return basis().up;
    },
    getRadius() {
      return radius;
    },
    getTarget() {
      return target;
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
        onChange();
      });
      const stop = () => {
        dragging = false;
      };
      el.addEventListener("pointerup", stop);
      el.addEventListener("pointercancel", stop);
    },
  };
}
