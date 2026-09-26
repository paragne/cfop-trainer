/**
 * The shape constants of a speedcube piece, and the rolled cap on each of its
 * outer faces. piece-mesh.ts builds the body from three rounded prisms; the cap
 * is what rounds the edge where an outer face meets the gap around its center.
 *
 * A cap is that face's outline (the same rounded square the prism along the
 * face's axis has, drawn FACE_INSET in so it sits on the inset faces) extruded
 * inward from the face, with its top following the face's ramp and the rim
 * where top meets wall rounded.
 *
 * The center is built as the real pieces are: a full-tile footprint with a flat
 * circular plateau on top and one lofted ramp from the circle down to the
 * square, short and steep mid-side, long and gentle at the corners. The ramp is
 * a field over the whole cube face (rampDepth), mirrored outward across the
 * seam round the center, so an edge or corner piece beside it dips to the same
 * height with the mirrored slope, and the four junctions are funnels where
 * slopes meet. Rims stay BEVEL_RADIUS along straight seams, matching the
 * center's, and swell to INNER_FILLET_RADIUS only on the curved corners facing
 * a junction, so the top rolls down into the gap there instead of dropping.
 *
 * Every piece is cut to one rounded box for the whole cube (shellDistance), so
 * the cube's outer edges and corners take OUTER_EDGE_RADIUS while the seams
 * between pieces keep BEVEL_RADIUS.
 */
import type { Vec } from "../../lib/cube.ts";
import { BEVEL_RADIUS } from "./cubie-mesh.ts";

// The radius an edge piece rounds its inward-pointing corners by, as a fraction
// of a tile's width. A center's ramp and the gaps around it are built on it.
export const CURVE_RADIUS = 0.25;

// Whether the piece at `home` cuts back its face's corner (sa, sb) in the plane
// of axes a and b: the ones pointing toward the middle of the cube face. A
// corner piece cuts none, on every speedcube; its face stays square.
export function cutsCorner(home: Vec, a: number, b: number, sa: number, sb: number): boolean {
  const isCornerPiece = home[0] !== 0 && home[1] !== 0 && home[2] !== 0;
  return !isCornerPiece && home[a] !== sa && home[b] !== sb;
}

// How far a flat face sits inside the cell boundary. Adjacent pieces each leave
// this much, so a seam reads as a hairline twice this wide.
export const FACE_INSET = 0.005;

// The rolled edge wherever a piece borders its face's center.
export const INNER_FILLET_RADIUS = 0.08;

// The cube's own outer edges and corners, rounder than the seams.
export const OUTER_EDGE_RADIUS = 0.09;

// The center: its flat top, how far its ramp falls by the seam, and its
// footprint's corner radius.
export const CENTER_PLATEAU_DIAMETER = 0.88;
export const CENTER_RAMP_DEPTH = 0.07;
export const CENTER_CORNER_RADIUS = 0.06;

// How far round a curved corner, as the share of its outline normal that points
// where the roll is wanted, the rolled edge holds its full radius before
// tapering to BEVEL_RADIUS.
const FILLET_TAPER = 0.5;

// Depth of the outer shell a face's color covers: the flat face and its whole
// rolled edge. Below this a piece's wall is internals.
export const SHELL_DEPTH = 0.5 - FACE_INSET - INNER_FILLET_RADIUS;

const smoothstep = (lo: number, hi: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
};

const HALF = 0.5 - FACE_INSET;
const PLATEAU = CENTER_PLATEAU_DIAMETER / 2;
const FOOT_CORNER = CENTER_CORNER_RADIUS - FACE_INSET;

// How far from the face's middle, along the unit direction (dx, dy), the seam
// round the center lies: its cell's outline, midway between the center's inset
// wall and its neighbours', so the mirror below treats both sides alike.
function seamReach(dx: number, dy: number): number {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const straight = 0.5 - CENTER_CORNER_RADIUS;
  const t = 0.5 / Math.max(ax, ay);
  if (t * ax <= straight || t * ay <= straight) return t;
  const along = straight * (ax + ay);
  return along + Math.sqrt(along * along - (2 * straight * straight - CENTER_CORNER_RADIUS * CENTER_CORNER_RADIUS));
}

// How far below the flat top a piece's surface lies at (x, y) on a cube face,
// measured from the face's middle. Zero on the plateau and away from the
// center; CENTER_RAMP_DEPTH on the seam round it. Past the seam the center's
// own profile is read back reflected along the ray from the middle,
// which gives the neighbour the same height at the seam and a slope mirrored
// exactly (both gradient components flip), and fades out a ramp's length away.
export function rampDepth(x: number, y: number): number {
  const r = Math.hypot(x, y);
  if (r <= PLATEAU) return 0;
  const reach = seamReach(x / r, y / r);
  const mirrored = r <= reach ? r : 2 * reach - r;
  const rho = Math.min(1, Math.max(0, (mirrored - PLATEAU) / (reach - PLATEAU)));
  return CENTER_RAMP_DEPTH * rho * rho;
}

// Signed distance to the whole cube's rounded box, from a point in the frame of
// the piece at `home`.
export function shellDistance(p: Vec, home: Vec): number {
  const inner = 1.5 - FACE_INSET - OUTER_EDGE_RADIUS;
  const qx = Math.abs(p[0] + home[0]) - inner;
  const qy = Math.abs(p[1] + home[1]) - inner;
  const qz = Math.abs(p[2] + home[2]) - inner;
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  const oz = Math.max(qz, 0);
  return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - OUTER_EDGE_RADIUS;
}

// The rim: the ramp does the rolling along straight seams, so only a curved
// corner facing a junction swells, fully across its middle and back to
// BEVEL_RADIUS where it meets a straight side. The center's rim stays thin.
function roll(isCenter: boolean, inward: boolean, na: number, nb: number): number {
  if (isCenter || !inward) return 0;
  return smoothstep(0, FILLET_TAPER, Math.min(Math.abs(na), Math.abs(nb)));
}

// Signed distance (negative inside) to the cap on the outer face along `axis`,
// on the side home[axis] names. `home` is the piece's solved position.
export function capDistance(p: Vec, home: Vec, axis: number): number {
  const a = (axis + 1) % 3;
  const b = (axis + 2) % 3;
  const isCenter = home[a] === 0 && home[b] === 0;
  // A corner piece's face is flat to its very corner: the ramp mirrored out
  // from the center would otherwise dip the tip that points at the junction.
  const isCornerPiece = home[0] !== 0 && home[1] !== 0 && home[2] !== 0;
  const depth = isCornerPiece ? 0 : rampDepth(p[a] + home[a], p[b] + home[b]);
  const height = home[axis] * p[axis] - (HALF - depth);
  const sa = p[a] < 0 ? -1 : 1;
  const sb = p[b] < 0 ? -1 : 1;
  const inward = cutsCorner(home, a, b, sa, sb);
  const corner = isCenter ? FOOT_CORNER : (inward ? CURVE_RADIUS : BEVEL_RADIUS) - FACE_INSET;
  const qa = Math.abs(p[a]) - (HALF - corner);
  const qb = Math.abs(p[b]) - (HALF - corner);
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

  const weight = roll(isCenter, inward, na, nb);
  const r = BEVEL_RADIUS + (INNER_FILLET_RADIUS - BEVEL_RADIUS) * weight;

  const ea = outline + r;
  const eb = height + r;
  return Math.hypot(Math.max(ea, 0), Math.max(eb, 0)) + Math.min(Math.max(ea, eb), 0) - r;
}
