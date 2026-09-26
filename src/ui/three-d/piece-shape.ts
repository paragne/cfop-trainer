/**
 * The shape constants of a speedcube piece, and the rolled cap on each of its
 * outer faces. piece-mesh.ts builds the body from three rounded prisms; the cap
 * is what rounds the edge where an outer face meets the gap around its center.
 *
 * A cap is that face's outline (the same rounded square the prism along the
 * face's axis has, drawn FACE_INSET in so it sits on the inset faces) extruded
 * inward from the face, with the rim where top meets wall rounded. The rim's
 * radius is BEVEL_RADIUS along outline that faces away from the face's center
 * and INNER_FILLET_RADIUS along outline that faces it, blended smoothly along
 * the curved corners between the two, so the top rolls down into the gap
 * around a center instead of dropping into it.
 */
import type { Vec } from "../../lib/cube.ts";
import { BEVEL_RADIUS } from "./cubie-mesh.ts";

// The one radius every piece rounds its inward-pointing corners by (corner,
// edge and center alike), as a fraction of a tile's width, so the curves of
// neighbouring pieces line up and the dark gap around a center is one width.
export const CURVE_RADIUS = 0.25;

// How far a flat face sits inside the cell boundary. Adjacent pieces each leave
// this much, so a seam reads as a hairline twice this wide.
export const FACE_INSET = 0.005;

// The rolled edge wherever a piece borders its face's center.
export const INNER_FILLET_RADIUS = 0.08;

// How far round a curved corner, as the cosine-like share of its outline
// normal that points at the center, the rolled edge holds its full radius
// before tapering to BEVEL_RADIUS at the corner's far end.
const FILLET_TAPER = 0.5;

// Depth of the outer shell a face's color covers: the flat face and its whole
// rolled edge. Below this a piece's wall is internals.
export const SHELL_DEPTH = 0.5 - FACE_INSET - INNER_FILLET_RADIUS;

const smoothstep = (lo: number, hi: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

// Signed distance (negative inside) to the cap on the outer face along `axis`,
// on the side home[axis] names. `home` is the piece's solved position.
export function capDistance(p: Vec, home: Vec, axis: number): number {
  const a = (axis + 1) % 3;
  const b = (axis + 2) % 3;
  const half = 0.5 - FACE_INSET;
  const height = home[axis] * p[axis] - half;
  const sa = p[a] < 0 ? -1 : 1;
  const sb = p[b] < 0 ? -1 : 1;
  const corner = (home[a] !== sa && home[b] !== sb ? CURVE_RADIUS : BEVEL_RADIUS) - FACE_INSET;
  const qa = Math.abs(p[a]) - (half - corner);
  const qb = Math.abs(p[b]) - (half - corner);
  const outline = Math.hypot(Math.max(qa, 0), Math.max(qb, 0)) + Math.min(Math.max(qa, qb), 0) - corner;

  // The outline's own outward normal at the nearest point, in (a, b).
  let na = 0;
  let nb = 0;
  if (qa > 0 && qb > 0) {
    const l = Math.hypot(qa, qb);
    na = (sa * qa) / l;
    nb = (sb * qb) / l;
  } else if (qa > qb) na = sa;
  else nb = sb;

  // How squarely that normal points at the face's center, from the piece's side
  // of it; a center is surrounded, so all of its outline faces in.
  let toward = Infinity;
  if (home[a] !== 0) toward = Math.min(toward, -home[a] * na);
  if (home[b] !== 0) toward = Math.min(toward, -home[b] * nb);
  const weight = toward === Infinity ? 1 : smoothstep(0, FILLET_TAPER, toward);
  const r = BEVEL_RADIUS + (INNER_FILLET_RADIUS - BEVEL_RADIUS) * weight;

  const ea = outline + r;
  const eb = height + r;
  return Math.hypot(Math.max(ea, 0), Math.max(eb, 0)) + Math.min(Math.max(ea, eb), 0) - r;
}
