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
// A flat, zero-thickness plane gives the browser's painter's-algorithm sort
// no volume to resolve ties with, which is what let a hidden face win at a
// shared silhouette edge even on a static cube. A shallow box, with one real
// plastic-colored face behind the sticker, fixes that.
const DEPTH_PX = 16;

const FILL: Record<Color, string> = {
  U: "#ffd500", D: "#ffffff", F: "#009b48", B: "#0046ad", R: "#ff5800", L: "#c8102e",
};
const PLASTIC = "#1a1a1a";

export type SceneSticker = { readonly outer: HTMLDivElement };

function square(px: number, color: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "square";
  el.style.width = `${px}px`;
  el.style.height = `${px}px`;
  el.style.marginLeft = `${-px / 2}px`;
  el.style.marginTop = `${-px / 2}px`;
  el.style.background = color;
  return el;
}

// A sticker is an outer pivot (zero-size, transform-origin at the cube
// center, per the animation decision) wrapping a thin box that never itself
// animates — only the pivot's transform changes.
export function buildScene(rig: HTMLElement, stickers: readonly PhysicalSticker[]): SceneSticker[] {
  return stickers.map((sticker) => {
    const outer = document.createElement("div");
    outer.className = "sticker";
    const face = square(FACE_PX, FILL[sticker.color]);
    face.classList.add("face");
    const back = square(FACE_PX, PLASTIC);
    back.style.transform = `translateZ(${-DEPTH_PX}px)`;
    outer.append(face, back);
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
