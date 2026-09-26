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
import type { ShownMask } from "../../lib/sticker-mask.ts";
import type { Vec } from "../../lib/cube.ts";
import type { PhysicalCubie } from "../../lib/physical-cube.ts";

// `logo` is the face that carries the app's mark, on the one cubie that has one.
export type FaceUniforms = {
  color: Float32Array;
  visible: Float32Array;
  logo: { face: number; column: Vec; row: Vec } | null;
};

// The dark core's own fixed color — not one of the six sticker Colors (see
// core-cubie.ts's core cubie, whose faces carry a placeholder Color never
// actually read; this picks it up by index instead).
const CORE_COLOR = toRgb("#1a1a1a");

// `mask` null means "show every sticker's true color" (no case loaded).
export function faceColorUniforms(home: PhysicalCubie, mask: ShownMask | null): FaceUniforms {
  const pieceColors = home.faces.filter((f) => f.isSticker).map((f) => f.colors[0]);
  const color = new Float32Array(18);
  const visible = new Float32Array(6);
  let logo: FaceUniforms["logo"] = null;
  home.faces.forEach((face, i) => {
    if (!face.isSticker) return;
    const kept = mask === null || isKeptSticker(mask, pieceColors, face.colors[0]);
    color.set(toRgb(kept ? FILL[face.colors[0]] : GRAY), i * 3);
    visible[i] = 1;
    // The white center only: any other piece, or a white center the mask
    // grays out, has no mark.
    if (kept && pieceColors.length === 1 && face.colors[0] === "D") logo = { face: i, column: face.column, row: face.row };
  });
  return { color, visible, logo };
}

export function coreFaceColorUniforms(): FaceUniforms {
  const color = new Float32Array(18);
  for (let i = 0; i < 6; i++) color.set(CORE_COLOR, i * 3);
  return { color, visible: new Float32Array(6).fill(1), logo: null };
}
