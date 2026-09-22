/**
 * Builds the 54 sticker elements and updates their placement. 54 outward
 * stickers, not 26 solid cubies, are all direct siblings of the rig — one
 * flat sorting context.
 *
 * The rig's own preserve-3d sort is left in place (removing it broke actual
 * 3D positioning, not just paint order — see the fix commit), but it turned
 * out to misorder faces even on a static cube, so reorderForPaint also
 * drives plain DOM order as a true painter's algorithm, which measurably
 * improves what actually gets painted alongside the browser's own sort.
 */
import { matrix3d, rotate3d } from "../../lib/css-transform.ts";
import type { Vec, Color } from "../../lib/cube.ts";
import { perpendicularBasis, surfacePosition } from "../../lib/physical-cube.ts";
import type { PhysicalSticker } from "../../lib/physical-cube.ts";

export const SCALE = 90; // pixels per cubie unit
const GAP_PX = 6;
const FACE_PX = SCALE - GAP_PX;
// A flat, zero-thickness plane also gave the OLD browser-sorted approach no
// volume to resolve ties with. The manual sort below doesn't strictly need
// it, but the box still reads as a nicer, more physical bevel than a plane.
const DEPTH_PX = 16;
// A cut-plane cap covers the full 3x3 cross-section a layer boundary exposes
// once the layer swings away from it, oversized slightly so its edges
// overlap the stationary cube rather than exactly meeting it.
const CAP_PX = SCALE * 3 + 4;

const FILL: Record<Color, string> = {
  U: "#ffd500", D: "#ffffff", F: "#009b48", B: "#0046ad", R: "#ff5800", L: "#c8102e",
};
const PLASTIC = "#1a1a1a";

export type SceneSticker = { readonly outer: HTMLDivElement };
export type Cap = { readonly outer: HTMLDivElement };
export type Scene = {
  readonly stickers: readonly SceneSticker[];
  reorderForPaint(positions: readonly Vec[], back: Vec): void;
  buildCap(axis: Vec, depth: number): Cap;
};

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

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
export function buildScene(rig: HTMLElement, stickers: readonly PhysicalSticker[]): Scene {
  const sceneStickers = stickers.map((sticker) => {
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

  // True painter's algorithm: farthest-from-camera first, so each later
  // append paints over the ones before it. Positions are passed in rather
  // than read from the stickers this module built, so a caller can pass an
  // in-flight animated sticker's true current (not just its at-rest) angle.
  // Reordering the DOM is real work at 54 elements, so it's skipped
  // whenever the sort didn't actually change anything.
  let lastOrder: readonly number[] | null = null;
  function reorderForPaint(positions: readonly Vec[], back: Vec): void {
    const order = sceneStickers.map((_, i) => i).sort((a, b) => dot(positions[a], back) - dot(positions[b], back));
    const previous = lastOrder;
    if (previous !== null && order.every((i, k) => i === previous[k])) return;
    lastOrder = order;
    for (const i of order) rig.append(sceneStickers[i].outer);
  }

  // A cut-plane cap: black, no sticker identity, gone once its move ends.
  // Never backface-culled — unlike a real sticker, whose normal is always
  // the outward direction the camera is meant to see, a cap at a slice's
  // far cut plane can face away from a world-fixed camera, and it must stay
  // visible from either side, or it would vanish exactly where it's needed.
  function buildCap(axis: Vec, depth: number): Cap {
    const outer = document.createElement("div");
    outer.className = "sticker";
    const plate = square(CAP_PX, PLASTIC);
    plate.style.backfaceVisibility = "visible";
    outer.append(plate);
    rig.append(outer);
    const { column, row } = perpendicularBasis(axis);
    const position: Vec = [axis[0] * depth, axis[1] * depth, axis[2] * depth];
    outer.style.transform = matrix3d(column, row, axis, position, SCALE);
    return { outer };
  }

  return { stickers: sceneStickers, reorderForPaint, buildCap };
}

// sticker.position is the cubie's center; the visible face sits half a
// cubie further out, along the sticker's own normal — see surfacePosition.
// Rendering it at position directly, as this did before, sinks every face
// half a cubie into the cube, so adjacent faces intersect and overhang each
// other at every edge instead of meeting at the surface.
export function setBaseTransform(outer: HTMLElement, sticker: PhysicalSticker): void {
  outer.style.transform = matrix3d(sticker.column, sticker.row, sticker.normal, surfacePosition(sticker), SCALE);
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
