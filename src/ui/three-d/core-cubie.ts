/**
 * Fills the small [-0.5, 0.5]^3 void every solved cube already has at its
 * center (each real cubie body starts exactly 0.5 units out on its nearest
 * axis) — otherwise an exposed cut plane mid-turn shows a hole there.
 * Physically attached to the centers, not free-floating: position [0,0,0]
 * means applyMoveToCubies moves it under the exact same rule as every other
 * cubie (depths.includes(dot(axis, position))), true for M/E/S, wide moves
 * and whole-cube rotations, false for a plain face turn — no second
 * decomposition. Colors are a placeholder ("U" is never read for it;
 * gl-scene.ts substitutes a fixed dark color by index) since Color has no
 * "core" member and cube.ts must not gain one for a rendering-only concept.
 */
import { ALL_AXES, homeCubies, perpendicularBasis } from "../../lib/physical-cube.ts";
import type { CubieFace, PhysicalCubie } from "../../lib/physical-cube.ts";

const CORE_CUBIE: PhysicalCubie = {
  position: [0, 0, 0],
  faces: ALL_AXES.map((normal): CubieFace => ({ normal, ...perpendicularBasis(normal), colors: ["U"], isSticker: true })),
};

export function homeCubiesWithCore(): readonly PhysicalCubie[] {
  return [...homeCubies(), CORE_CUBIE];
}
