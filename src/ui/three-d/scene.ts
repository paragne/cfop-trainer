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
import { surfacePosition } from "../../lib/physical-cube.ts";
import type { PhysicalSticker } from "../../lib/physical-cube.ts";
import { createPanels } from "./panels.ts";
import type { Cap } from "./panels.ts";

export type { Cap } from "./panels.ts";

export const SCALE = 90; // pixels per cubie unit
const GAP_PX = 3;
const FACE_PX = SCALE - GAP_PX;

// Sampled from the speedcube palette (reference/gan_cube_color_reference.jpg
// carried the chirality; the exact hex values are the product's own).
const FILL: Record<Color, string> = {
  U: "#ffdc00", D: "#ffffff", F: "#00a651", B: "#0062ff", R: "#ff6600", L: "#e53935",
};

export type SceneSticker = { readonly outer: HTMLDivElement };
export type Scene = {
  readonly stickers: readonly SceneSticker[];
  reorderForPaint(positions: readonly Vec[], back: Vec): void;
  buildCap(axis: Vec, depth: number): Cap;
  coreOuter(normal: Vec): HTMLElement;
  hideCore(normal: Vec): void;
  showCore(normal: Vec): void;
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
    outer.append(face);
    rig.append(outer);
    setBaseTransform(outer, sticker);
    return { outer };
  });

  // The black interior — 6 permanent face cores plus however many cut-plane
  // caps the current move has open — sorts for paint alongside the 54
  // stickers above but otherwise manages its own geometry; see panels.ts.
  const panels = createPanels(rig, SCALE);

  // True painter's algorithm: farthest-from-camera first, so each later
  // append paints over the ones before it. Sticker positions are passed in
  // rather than read from the stickers this module built, so a caller can
  // pass an in-flight animated sticker's true current (not just its at-rest)
  // angle. Reordering the DOM is real work, so it's skipped whenever the
  // sort didn't actually change anything.
  let lastOrder: readonly HTMLDivElement[] | null = null;
  function reorderForPaint(positions: readonly Vec[], back: Vec): void {
    const all = [
      ...sceneStickers.map((s, i) => ({ outer: s.outer, position: positions[i] })),
      ...panels.fixed,
    ].sort((a, b) => dot(a.position, back) - dot(b.position, back));
    const order = all.map((a) => a.outer);
    const previous = lastOrder;
    if (previous !== null && order.length === previous.length && order.every((el, k) => el === previous[k])) {
      return;
    }
    lastOrder = order;
    for (const el of order) rig.append(el);
  }

  return {
    stickers: sceneStickers,
    reorderForPaint,
    buildCap: panels.buildCap,
    coreOuter: panels.coreOuter,
    hideCore: panels.hideCore,
    showCore: panels.showCore,
  };
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
