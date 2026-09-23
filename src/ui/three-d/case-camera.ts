/**
 * Where the camera looks for a given case. OLL/PLL keeps the existing
 * per-case corrective rotation (matches case-state.ts's normalize(), so
 * yellow stays on top and the front/right faces stay put across cases —
 * verified against every non-F2L case in the data file). F2L gets none of
 * that: the target slot's screen position is fixed and case-independent
 * (FR is always FR), so there's nothing to correct for. Its eye direction
 * mirrors across x for FL, the same way render.ts's iso-fl camera mirrors
 * the 2D projection — otherwise the eye stays on the R side and the L face
 * the FL pair actually needs is never in view, only foreshortened at best.
 *
 * The look-at point always stays the cube's own center, for every case:
 * an earlier version retargeted it at the slot instead, which threw off
 * the near/far framing enough to look like the camera was centered on one
 * edge rather than the cube. Locking the eye to the slot's side (FR vs FL)
 * already makes the pair prominent, the same way the 2D iso view does,
 * without needing to move what the camera is actually pointed at.
 */
import { applyMoves, SOLVED } from "../../lib/cube.ts";
import type { Vec } from "../../lib/cube.ts";
import { homeRotation } from "../../lib/orientation.ts";
import type { Move } from "../../lib/notation.ts";
import type { Camera } from "./camera.ts";
import type { Mask } from "../../data/algorithms.ts";

const ORIGIN: Vec = [0, 0, 0];

export function applyCameraForCase(camera: Camera, mask: Mask | null, setupMoves: readonly Move[]): void {
  if (mask !== null && mask.kind === "f2l") {
    const eye: Vec = mask.slot === "FR" ? [1, 1, 1] : [-1, 1, 1];
    camera.setEyeDirection(eye);
  } else {
    camera.setCorrective(homeRotation(applyMoves(SOLVED, setupMoves)));
  }
  camera.setTarget(ORIGIN);
}
