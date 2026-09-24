/**
 * Where the camera looks. Two independent pieces: which side the eye is on
 * (fixed per case: F2L is isometric, mirrored across x for FL so the L face
 * is on screen instead of R, the same way render.ts's iso-fl camera mirrors
 * the 2D projection; OLL and PLL look down on the top layer, like the 2D top
 * view), and the corrective rotation, which is NOT fixed at case
 * load — it's a pure function of whatever cubies are currently at rest on
 * screen, recomputed every time the cube settles (main.ts does this from
 * the render loop, only when inFlight is null and the cubies reference has
 * actually changed, so it stays render-on-demand rather than a continuous
 * per-frame recompute).
 *
 * That statelessness is what makes this correct through an animation and
 * not just at load: three F2L cases (f2l-slot-3/4/5 — already documented
 * as exceptions in orientation.test.ts) use a partial-depth move (d) or a
 * mid-sequence whole-cube rotation (y') whose effect on the cross and pair
 * a single rigid rotation reproduces at setup time but not once the
 * algorithm's own later moves partially undo it. Recomputing at every rest
 * point means the camera always matches whatever's genuinely on screen —
 * for the common case (no twist anywhere in the sequence) homeRotation
 * returns an empty correction throughout and this is a no-op, same as a
 * plain default camera. main.ts snaps the very first correction after a
 * case loads and tweens every one after — see camera.ts's setCorrective.
 *
 * The correction itself is homeRotation's — inverted. homeRotation finds
 * the rotation that, applied to a cube's *data*, brings U/F home; camera.ts
 * applies whatever it's given to the *eye* instead, and rotating the eye by
 * R shows the same picture as rotating the object by R⁻¹, so the camera
 * needs homeRotation's result inverted to land on the same picture
 * normalize() would draw. (For OLL/PLL this was never visible before now:
 * homeRotation is empty for every non-F2L case but oll-42, so inverting an
 * empty correction changes nothing there.)
 */
import { homeRotation } from "../../lib/orientation.ts";
import { invert } from "../../lib/notation.ts";
import { colorsAtCubies } from "../../lib/physical-cube.ts";
import type { PhysicalCubie } from "../../lib/physical-cube.ts";
import type { Vec } from "../../lib/cube.ts";
import type { Camera } from "./camera.ts";
import type { Mask } from "../../data/algorithms.ts";

const ORIGIN: Vec = [0, 0, 0];

// About 27 degrees off vertical, toward F: near enough to the flat top view
// the 2D picture uses for OLL and PLL to compare at a glance, tilted enough
// that the side stickers a move exposes stay visible.
const TOP_DOWN: Vec = [0, 3, 1.5];

export function eyeFor(mask: Mask | null): Vec {
  if (mask === null) return [1, 1, 1];
  if (mask.kind !== "f2l") return TOP_DOWN;
  return mask.slot === "FL" ? [-1, 1, 1] : [1, 1, 1];
}

export function applyEyeForCase(camera: Camera, mask: Mask | null): void {
  camera.setEyeDirection(eyeFor(mask));
  camera.setTarget(ORIGIN);
}

export function applyCorrectiveForCubies(camera: Camera, cubies: readonly PhysicalCubie[], snap: boolean): void {
  camera.setCorrective(invert(homeRotation(colorsAtCubies(cubies))), snap);
}
