/**
 * The mesh of one piece of a speedcube, in the piece's own home frame (the unit
 * cube, at rest a flat face at 0.5 along its normal). A piece is the
 * intersection of three prisms, one along each axis, each with a rounded-square
 * cross-section: an edge of the piece runs along one axis, so it is filleted by
 * the prism along that axis. The fillet is a large CURVE_RADIUS where the edge
 * meets the piece's own side of the cube's interior, a small BEVEL_RADIUS where
 * it lies on the cube's outer boundary.
 *
 * That is the curve a speedcube's pieces have. Every corner of a sticker face
 * that points toward the middle of the cube face is rounded off, so a corner
 * piece has one, an edge piece two, and a center all four; the corners on the
 * cube's silhouette stay square. Where four pieces meet the rounding opens a
 * notch, and the internals show through it.
 *
 * Each point of the flat unit-cube surface is projected toward the origin onto
 * that shape. The shape is convex and holds the origin, so every direction
 * crosses it once, and two faces' independently-generated grids agree exactly
 * on their shared edge, so the mesh has no seams to stitch.
 */
import { ALL_AXES, perpendicularBasis } from "../../lib/physical-cube.ts";
import type { Vec } from "../../lib/cube.ts";
import { BEVEL_RADIUS } from "./cubie-mesh.ts";
import type { MeshVertex } from "./cubie-mesh.ts";

// The one radius every piece rounds its inward-pointing corners by (corner,
// edge and center alike), as a fraction of a tile's width, so the curves of
// neighbouring pieces line up and the dark gap around a center is one width.
export const CURVE_RADIUS = 0.25;

// How far a flat face sits inside the cell boundary. Adjacent pieces each leave
// this much, so a seam reads as a hairline twice this wide.
export const FACE_INSET = 0.005;

// Samples along each axis of a face: fine across the band the rounded corners
// live in, coarse across the flat middle. Grid lines land exactly on where a
// straight side turns into an arc, so that boundary is a grid line and not a
// staircase across cells.
const BAND_SEGMENTS = 12;
const MIDDLE_SEGMENTS = 2;
const evenSteps = (lo: number, hi: number, steps: number) =>
  Array.from({ length: steps + 1 }, (_, i) => lo + ((hi - lo) * i) / steps);
const STRAIGHT = 0.5 - CURVE_RADIUS;
const SAMPLES = [
  ...evenSteps(-0.5, -STRAIGHT, BAND_SEGMENTS),
  ...evenSteps(-STRAIGHT, STRAIGHT, MIDDLE_SEGMENTS).slice(1, -1),
  ...evenSteps(STRAIGHT, 0.5, BAND_SEGMENTS),
];
const SEGMENTS = SAMPLES.length - 1;

type Exit = { t: number; normal: readonly [number, number] };

// Where a ray from the origin along (dx, dy) leaves a square of half-width 0.5
// whose corner in quadrant (sx, sy) has radius radiusAt(sx, sy), as a multiple
// of (dx, dy). Infinite for a zero direction, which never leaves.
function leaveRoundedSquare(dx: number, dy: number, radiusAt: (sx: number, sy: number) => number): Exit {
  const reach = Math.max(Math.abs(dx), Math.abs(dy));
  if (reach === 0) return { t: Infinity, normal: [0, 0] };
  const t = 0.5 / reach;
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  const r = radiusAt(sx, sy);
  const straight = 0.5 - r;
  if (Math.abs(t * dx) < straight || Math.abs(t * dy) < straight) {
    return { t, normal: Math.abs(dx) >= Math.abs(dy) ? [sx, 0] : [0, sy] };
  }
  const cx = sx * straight;
  const cy = sy * straight;
  const dd = dx * dx + dy * dy;
  const along = dx * cx + dy * cy;
  const arc = (along + Math.sqrt(along * along - dd * (cx * cx + cy * cy - r * r))) / dd;
  return { t: arc, normal: [(arc * dx - cx) / r, (arc * dy - cy) / r] };
}

// The prism along `axis` rounds its corner (sa, sb) heavily unless that corner
// is on the cube's outer boundary: the piece sits at the extreme in that
// direction along either of the other two axes.
function radiusOf(home: Vec, a: number, b: number) {
  return (sa: number, sb: number) => (home[a] !== sa && home[b] !== sb ? CURVE_RADIUS : BEVEL_RADIUS);
}

// The three prisms are joined by a smooth minimum rather than a hard one, so
// the crease where two of them meet is a soft blend instead of a sharp line
// that a grid of triangles would cross in a sawtooth. It also leaves the flat
// faces FACE_INSET inside the unit cube (two prisms tie on a flat face, so the
// minimum drops by MERGE * ln 2), which is the small gap a real cube's pieces
// have between them.
const MERGE = FACE_INSET / Math.LN2;

function project(direction: Vec, home: Vec): MeshVertex {
  const exits = [0, 1, 2].map((axis) => {
    const a = (axis + 1) % 3;
    const b = (axis + 2) % 3;
    const exit = leaveRoundedSquare(direction[a], direction[b], radiusOf(home, a, b));
    const normal: [number, number, number] = [0, 0, 0];
    normal[a] = exit.normal[0];
    normal[b] = exit.normal[1];
    return { t: exit.t, normal };
  });
  const nearest = Math.min(...exits.map((e) => e.t));
  const weights = exits.map((e) => Math.exp(-(e.t - nearest) / MERGE));
  const total = weights.reduce((sum, w) => sum + w, 0);
  const t = nearest - MERGE * Math.log(total);
  const blended = [0, 1, 2].map((k) => exits.reduce((sum, e, i) => sum + (weights[i] / total) * e.normal[k], 0));
  const length = Math.hypot(...blended);
  return {
    position: [direction[0] * t, direction[1] * t, direction[2] * t],
    normal: [blended[0] / length, blended[1] / length, blended[2] / length],
  };
}

// `home` is the piece's position in the solved cube, each coordinate -1, 0 or 1.
export function pieceVertices(home: Vec): MeshVertex[] {
  const vertices: MeshVertex[] = [];
  for (const normal of ALL_AXES) {
    const { column, row } = perpendicularBasis(normal);
    const grid = SAMPLES.map((u) =>
      SAMPLES.map((v): MeshVertex => {
        const at = (k: number) => normal[k] * 0.5 + column[k] * u + row[k] * v;
        const flat: Vec = [at(0), at(1), at(2)];
        return project(flat, home);
      }),
    );
    for (let i = 0; i < SEGMENTS; i++) {
      for (let j = 0; j < SEGMENTS; j++) {
        const c00 = grid[i][j];
        const c10 = grid[i + 1][j];
        const c11 = grid[i + 1][j + 1];
        const c01 = grid[i][j + 1];
        vertices.push(c00, c10, c11, c00, c11, c01);
      }
    }
  }
  return vertices;
}
