/**
 * The cube's interior plastic: a face's permanent black core (behind its 9
 * stickers, filling any seam between them) and a turning layer's temporary
 * cut-plane cap (filling the gap that opens as it swings away). Both are
 * flat quads sized to a layer's exact 3x3 cross-section — never larger, so
 * neither can ever overhang past the cube's true 1.5-unit surface into a
 * neighbouring face's space. Two oversized, overhanging backing plates
 * meeting at a cube edge is what once produced a dashed z-fighting fringe
 * there; staying strictly within bounds makes that geometrically impossible.
 */
import { matrix3d } from "../../lib/css-transform.ts";
import type { Vec } from "../../lib/cube.ts";
import { perpendicularBasis } from "../../lib/physical-cube.ts";

// How far inside the true surface a face's black core sits, in cube units —
// just enough that it never z-fights the stickers sitting exactly at the
// surface, not so much it visibly sinks under an oblique view.
const CORE_INSET = 0.03;
const CORE_DEPTH = 1.5 - CORE_INSET;
const CORE_COLOR = "#1a1a1a";
const ALL_AXES: readonly Vec[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

type Panel = { outer: HTMLDivElement; position: Vec };
export type Cap = { remove(): void };
export type Panels = {
  readonly fixed: readonly Panel[];
  buildCap(axis: Vec, depth: number): Cap;
  coreOuter(normal: Vec): HTMLElement;
  hideCore(normal: Vec): void;
  showCore(normal: Vec): void;
};

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

// Manages the cube's black interior geometry: 6 permanent face cores plus
// however many cut-plane caps the current move has open. Never backface-
// culled — a panel is meant to be seen from either side (a cap at a slice's
// far cut plane can face away from a world-fixed camera; a core is only
// ever meant to be seen from outside, but costs nothing extra to leave
// visible either way).
export function createPanels(rig: HTMLElement, scale: number): Panels {
  const panelPx = scale * 3;

  function buildPanel(axis: Vec, depth: number): Panel {
    const outer = document.createElement("div");
    outer.className = "sticker";
    const plate = square(panelPx, CORE_COLOR);
    plate.style.backfaceVisibility = "visible";
    outer.append(plate);
    rig.append(outer);
    const { column, row } = perpendicularBasis(axis);
    const position: Vec = [axis[0] * depth, axis[1] * depth, axis[2] * depth];
    outer.style.transform = matrix3d(column, row, axis, position, scale);
    return { outer, position };
  }

  const cores = new Map(ALL_AXES.map((normal) => [String(normal), buildPanel(normal, CORE_DEPTH)]));
  const fixed: Panel[] = [...cores.values()];

  function buildCap(axis: Vec, depth: number): Cap {
    const entry = buildPanel(axis, depth);
    fixed.push(entry);
    return {
      remove() {
        entry.outer.remove();
        const i = fixed.indexOf(entry);
        if (i !== -1) fixed.splice(i, 1);
      },
    };
  }

  // For a move that rotates this face's own 9 stickers in their own plane
  // (see turningFaceNormals) — the caller animates this along with them,
  // the same way a real cube's top layer carries its own backing plastic
  // around with it, rather than leaving a fixed, never-rotating square
  // behind for a rotated layer's corners to poke past. Its position doesn't
  // change even while rotating (an axis-parallel vector is rotation-
  // invariant about that axis), so it never needs re-adding to `fixed`.
  function coreOuter(normal: Vec): HTMLElement {
    const entry = cores.get(String(normal));
    if (!entry) throw new Error(`no core for normal ${String(normal)}`);
    return entry.outer;
  }

  // Taken down for the duration of a move that fully turns some other face
  // (see perpendicularFaceNormals) — that face's rotated-away corner would
  // otherwise expose this untouched face's own corner reaching the same
  // shared vertex; put back once every face is at rest again.
  function hideCore(normal: Vec): void {
    const entry = cores.get(String(normal));
    if (!entry) return;
    entry.outer.remove();
    const i = fixed.indexOf(entry);
    if (i !== -1) fixed.splice(i, 1);
  }
  function showCore(normal: Vec): void {
    const entry = cores.get(String(normal));
    if (!entry || fixed.includes(entry)) return;
    rig.append(entry.outer);
    fixed.push(entry);
  }

  return { fixed, buildCap, coreOuter, hideCore, showCore };
}
