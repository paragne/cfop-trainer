/**
 * Builds the 54 sticker elements and updates their placement. 54 outward
 * stickers, not 26 solid cubies, are all direct siblings of the rig — one
 * flat sorting context, per SPEC's painter's-algorithm mitigation.
 */
import { matrix3d, rotate3d } from "../../lib/css-transform.ts";
import type { Vec, Color } from "../../lib/cube.ts";
import type { PhysicalSticker } from "../../lib/physical-cube.ts";

export const SCALE = 90; // pixels per cubie unit
const GAP_PX = 6;
const FACE_PX = SCALE - GAP_PX;

const FILL: Record<Color, string> = {
  U: "#ffd500", D: "#ffffff", F: "#009b48", B: "#0046ad", R: "#ff5800", L: "#c8102e",
};

export type SceneSticker = { readonly outer: HTMLDivElement };

// A sticker is an outer pivot (zero-size, transform-origin at the cube
// center, per the animation decision) wrapping a static square that never
// itself animates — only the pivot's transform changes.
export function buildScene(rig: HTMLElement, stickers: readonly PhysicalSticker[]): SceneSticker[] {
  return stickers.map((sticker) => {
    const outer = document.createElement("div");
    outer.className = "sticker";
    const face = document.createElement("div");
    face.className = "face";
    face.style.width = `${FACE_PX}px`;
    face.style.height = `${FACE_PX}px`;
    face.style.marginLeft = `${-FACE_PX / 2}px`;
    face.style.marginTop = `${-FACE_PX / 2}px`;
    face.style.background = FILL[sticker.color];
    outer.append(face);
    rig.append(outer);
    setBaseTransform(outer, sticker);
    return { outer };
  });
}

export function setBaseTransform(outer: HTMLElement, sticker: PhysicalSticker): void {
  outer.style.transform = matrix3d(sticker.column, sticker.row, sticker.normal, sticker.position, SCALE);
}

// Matching transform lists (rotate3d leftmost, the same base matrix3d text
// in both keyframes) so the browser interpolates the angle as a scalar
// instead of decomposing two matrices — decomposition lerps translation
// linearly, which pinches off-axis layers toward the rotation axis mid-turn,
// and is ambiguous at 180°.
export function animateSticker(
  outer: HTMLElement,
  axis: Vec,
  fromDeg: number,
  toDeg: number,
  durationMs: number,
): Animation {
  const base = outer.style.transform;
  return outer.animate(
    [
      { transform: `${rotate3d(axis, fromDeg)} ${base}` },
      { transform: `${rotate3d(axis, toDeg)} ${base}` },
    ],
    { duration: durationMs, easing: "ease-in-out", fill: "forwards" },
  );
}
