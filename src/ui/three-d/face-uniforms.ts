/**
 * Turns a cubie's home face data into the GPU color/visibility uniforms
 * gl-scene.ts uploads per cubie. Colors never change for a given
 * cubie/face-slot (see physical-cube.ts), so this bakes uniforms once from
 * `home`, never from the live evolving cubies — and since a physical
 * sticker's mask verdict is likewise fixed at its own piece identity and
 * own color (sticker-mask.ts), never at its current position, it bakes the
 * same way: once per case load, not recomputed as the cubie moves.
 */
import { FILL, GRAY, toRgb } from "../../lib/palette.ts";
import { isKeptSticker } from "../../lib/sticker-mask.ts";
import type { Mask } from "../../data/algorithms.ts";
import type { PhysicalCubie } from "../../lib/physical-cube.ts";

export type FaceUniforms = { color: Float32Array; visible: Float32Array };

// The dark core's own fixed color — not one of the six sticker Colors (see
// core-cubie.ts's core cubie, whose faces carry a placeholder Color never
// actually read; this picks it up by index instead).
const CORE_COLOR = toRgb("#1a1a1a");

// `mask` null means "show every sticker's true color" (no case loaded).
export function faceColorUniforms(home: PhysicalCubie, mask: Mask | null): FaceUniforms {
  const pieceColors = home.faces.filter((f) => f.isSticker).map((f) => f.colors[0]);
  const color = new Float32Array(18);
  const visible = new Float32Array(6);
  home.faces.forEach((face, i) => {
    if (!face.isSticker) return;
    const kept = mask === null || isKeptSticker(mask, pieceColors, face.colors[0]);
    color.set(toRgb(kept ? FILL[face.colors[0]] : GRAY), i * 3);
    visible[i] = 1;
  });
  return { color, visible };
}

export function coreFaceColorUniforms(): FaceUniforms {
  const color = new Float32Array(18);
  for (let i = 0; i < 6; i++) color.set(CORE_COLOR, i * 3);
  return { color, visible: new Float32Array(6).fill(1) };
}
