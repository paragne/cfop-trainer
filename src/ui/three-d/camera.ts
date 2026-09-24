/**
 * Camera state only — no per-move hooks. A locked camera that followed
 * whole-cube rotations would make them visually invisible and silently
 * change which physical layer a later move appears to turn on screen, so
 * locked mode is world-fixed: a fixed basis, rotated only by a case's own
 * corrective rotation, which for most cases is set once (at load) and never
 * again. A few F2L cases need it to change mid-playback too (see
 * case-camera.ts) — snapping instantly there reads as the view breaking,
 * since it can land mid-way through an unrelated piece's own turn
 * animation, so a same-case correction change tweens instead (see
 * basis-transition.ts); only a fresh case load (an unrelated cut anyway)
 * snaps. Free mode is plain user-driven orbit, independent of algorithm
 * playback.
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
import { createBasisTransition } from "./basis-transition.ts";
import type { Basis } from "./basis-transition.ts";
import type { Move } from "../../lib/notation.ts";

const EYE: Vec = [1, 1, 1];
const WORLD_UP: Vec = [0, 1, 0];
const DEFAULT_RADIUS = 12;
const PITCH_LIMIT = 85;

export type CameraMode = "locked" | "free";

export type Camera = {
  setMode(mode: CameraMode): void;
  // Rotates from whichever eye direction setEyeDirection last set (default
  // [1,1,1]) — composable with it, so an FL case's mirrored eye and a
  // case's corrective rotation both apply together. Snaps instantly the
  // first time for a freshly loaded case (`snap: true`); a later call for
  // the same case (a mid-algorithm recompute finding a new correction)
  // tweens smoothly instead.
  setCorrective(moves: readonly Move[], snap?: boolean): void;
  // Sets the base eye direction the locked basis (and setCorrective's next
  // rotation) starts from — e.g. mirrored across x for an FL case, so the L
  // face is on screen instead of R. Always instant: only called on a fresh
  // case load, alongside a snapping setCorrective. See basis-transition.ts
  // for how the "snap the first time, tween after" split is implemented.
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
  // The un-rotated reference setCorrective's next call rotates from —
  // normally DEFAULT_BASIS, but setEyeDirection can replace it (FL's
  // mirrored eye) so the two compose regardless of call order.
  let baseBasis = DEFAULT_BASIS;
  const lockedBasis = createBasisTransition(DEFAULT_BASIS, onChange);
  let freeBasis = DEFAULT_BASIS;
  // Degrees pitched from the default, level view — tracked separately from
  // freeBasis so a drag past the limit can be clamped (a per-event delta
  // can't be clamped meaningfully; only the cumulative angle can). Lives
  // here, not inside attachDrag, so setMode can reset it alongside freeBasis.
  let pitchAccum = 0;

  function basis(): Basis {
    return mode === "free" ? freeBasis : lockedBasis.current();
  }

  return {
    setMode(next) {
      // Free cam always re-enters at the current fixed angle rather than
      // resuming wherever a previous drag left it.
      if (next === "free") {
        lockedBasis.stop();
        freeBasis = lockedBasis.current();
        pitchAccum = 0;
      }
      mode = next;
      onChange();
    },
    setCorrective(moves, snap = false) {
      lockedBasis.set(rotateBasis(baseBasis, moves), snap);
    },
    setEyeDirection(eye) {
      baseBasis = screenAxes(eye);
      lockedBasis.set(baseBasis, true);
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
