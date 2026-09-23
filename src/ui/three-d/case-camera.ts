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
 */
import { applyMoves, SOLVED } from "../../lib/cube.ts";
import type { Color, Vec } from "../../lib/cube.ts";
import { homeRotation } from "../../lib/orientation.ts";
import { homeCubies } from "../../lib/physical-cube.ts";
import type { Move } from "../../lib/notation.ts";
import type { Camera } from "./camera.ts";
import type { Mask } from "../../data/algorithms.ts";

const ORIGIN: Vec = [0, 0, 0];

const midpoint = (a: Vec, b: Vec): Vec => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

// The midpoint of the target corner's and edge's home positions, found by
// color the same way sticker-mask.ts's target-pair matching does — not a
// hand-picked constant. Fixed per slot: [1,-0.5,1] for FR, [-1,-0.5,1] for FL.
export function f2lSlotTarget(slot: "FR" | "FL"): Vec {
  const side: Color = slot === "FR" ? "R" : "L";
  const cubies = homeCubies();
  const pieceColors = (i: number) => cubies[i].faces.filter((f) => f.isSticker).map((f) => f.colors[0]);
  const corner = cubies.find((_, i) => {
    const colors = pieceColors(i);
    const target: readonly Color[] = ["D", "F", side];
    return colors.length === 3 && target.every((c) => colors.includes(c));
  });
  const edge = cubies.find((_, i) => {
    const colors = pieceColors(i);
    const target: readonly Color[] = ["F", side];
    return colors.length === 2 && target.every((c) => colors.includes(c));
  });
  if (corner === undefined || edge === undefined) throw new Error(`f2lSlotTarget: no pair found for ${slot}`);
  return midpoint(corner.position, edge.position);
}

export function applyCameraForCase(camera: Camera, mask: Mask | null, setupMoves: readonly Move[]): void {
  if (mask !== null && mask.kind === "f2l") {
    const eye: Vec = mask.slot === "FR" ? [1, 1, 1] : [-1, 1, 1];
    camera.setEyeDirection(eye);
    camera.setTarget(f2lSlotTarget(mask.slot));
  } else {
    camera.setCorrective(homeRotation(applyMoves(SOLVED, setupMoves)));
    camera.setTarget(ORIGIN);
  }
}
