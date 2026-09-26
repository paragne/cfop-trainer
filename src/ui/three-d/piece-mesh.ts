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
 * Each outer face also gets a rolled cap (see piece-shape.ts) that the body is
 * cut down to, which rounds its edge into the gap around the face's center.
 *
 * Each point of the flat unit-cube surface is projected toward the origin onto
 * that shape. The shape holds the origin and every direction crosses it once, and two faces' independently-generated grids agree exactly
 * on their shared edge, so the mesh has no seams to stitch.
 */
import { ALL_AXES, perpendicularBasis } from "../../lib/physical-cube.ts";
import type { Vec } from "../../lib/cube.ts";
import { BEVEL_RADIUS } from "./cubie-mesh.ts";
import type { MeshVertex } from "./cubie-mesh.ts";
import { capDistance, CENTER_CORNER_RADIUS, CURVE_RADIUS, cutsCorner, FACE_INSET, OUTER_EDGE_RADIUS, shellDistance } from "./piece-shape.ts";

// Samples along each axis of a face: fine across the outermost band, where the
// cube's outer edges lie, finer than across the band an edge piece's large arc
// lives in, coarse across the flat middle. Grid lines land exactly on where a
// straight side turns into that arc, so the boundary is a grid line and not a
// staircase across cells.
const BAND_SEGMENTS = 6;
const OUTER_SEGMENTS = 8;
const MIDDLE_SEGMENTS = 6;
const evenSteps = (lo: number, hi: number, steps: number) =>
  Array.from({ length: steps + 1 }, (_, i) => lo + ((hi - lo) * i) / steps);
const STRAIGHT = 0.5 - CURVE_RADIUS;
const OUTER = 0.5 - OUTER_EDGE_RADIUS;
const SAMPLES = [
  ...evenSteps(-0.5, -OUTER, OUTER_SEGMENTS),
  ...evenSteps(-OUTER, -STRAIGHT, BAND_SEGMENTS).slice(1),
  ...evenSteps(-STRAIGHT, STRAIGHT, MIDDLE_SEGMENTS).slice(1, -1),
  ...evenSteps(STRAIGHT, OUTER, BAND_SEGMENTS),
  ...evenSteps(OUTER, 0.5, OUTER_SEGMENTS).slice(1),
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
// A center has no notches: its prism along the face's axis is the full-tile
// footprint, with only a small corner radius.
function radiusOf(home: Vec, a: number, b: number) {
  if (home[a] === 0 && home[b] === 0) return () => CENTER_CORNER_RADIUS;
  return (sa: number, sb: number) => (cutsCorner(home, a, b, sa, sb) ? CURVE_RADIUS : BEVEL_RADIUS);
}

// The three prisms are joined by a smooth minimum rather than a hard one, so
// the crease where two of them meet is a soft blend instead of a sharp line
// that a grid of triangles would cross in a sawtooth. It also leaves the flat
// faces FACE_INSET inside the unit cube (two prisms tie on a flat face, so the
// minimum drops by MERGE * ln 2), which is the small gap a real cube's pieces
// have between them.
const MERGE = FACE_INSET / Math.LN2;

const scaled = (v: Vec, t: number): Vec => [v[0] * t, v[1] * t, v[2] * t];

// The deepest cut at p of any outer face's cap or of the whole cube's rounded
// box: positive where one removes it.
function caps(p: Vec, home: Vec): number {
  let worst = shellDistance(p, home);
  for (let axis = 0; axis < 3; axis++) if (home[axis] !== 0) worst = Math.max(worst, capDistance(p, home, axis));
  return worst;
}

const BISECTIONS = 16;
// A cap never cuts deeper than this share of the way along a ray, so the
// search starts there instead of at the origin.
const DEEPEST_CUT = 0.85;
const GRADIENT_STEP = 1e-5;

// Where the ray leaves the body cut down by the caps: the body's own exit if no
// cap reaches it, otherwise the caps' surface, found by bisection (the origin is
// inside every cap) and lit by the caps' gradient.
function cutByCaps(direction: Vec, home: Vec, body: MeshVertex, bodyT: number): MeshVertex {
  const cut = (p: Vec) => caps(p, home);
  if (cut(body.position) <= 1e-9) return body;
  let lo = cut(scaled(direction, bodyT * DEEPEST_CUT)) <= 0 ? bodyT * DEEPEST_CUT : 0;
  let hi = bodyT;
  for (let i = 0; i < BISECTIONS; i++) {
    const mid = (lo + hi) / 2;
    if (cut(scaled(direction, mid)) > 0) hi = mid;
    else lo = mid;
  }
  const position = scaled(direction, (lo + hi) / 2);
  const nudged = (k: number, by: number): Vec => [
    position[0] + (k === 0 ? by : 0),
    position[1] + (k === 1 ? by : 0),
    position[2] + (k === 2 ? by : 0),
  ];
  const slope = [0, 1, 2].map((k) => cut(nudged(k, GRADIENT_STEP)) - cut(nudged(k, -GRADIENT_STEP)));
  const length = Math.hypot(...slope);
  return { position, normal: [slope[0] / length, slope[1] / length, slope[2] / length] };
}

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
  const body: MeshVertex = { position: scaled(direction, t), normal: [blended[0] / length, blended[1] / length, blended[2] / length] };
  return cutByCaps(direction, home, body, t);
}

// Built once per piece and kept, since a 3D view is opened many times a session.
const built = new Map<string, readonly MeshVertex[]>();

// `home` is the piece's position in the solved cube, each coordinate -1, 0 or 1.
export function pieceVertices(home: Vec): readonly MeshVertex[] {
  const key = home.join();
  const cached = built.get(key);
  if (cached !== undefined) return cached;
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
  built.set(key, vertices);
  return vertices;
}
