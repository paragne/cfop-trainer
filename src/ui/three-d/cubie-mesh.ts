/**
 * The one rounded-box mesh every cubie is drawn with — 26 (plus the core, see
 * gl-scene.ts) draw calls of the same geometry, differing only by model
 * matrix and per-cubie color uniforms. Local space only: at rest a flat face
 * sits at ±0.5 along its normal, matching "cubies are exactly 1 unit, no
 * physical gaps" — placement is entirely the model matrix's job.
 *
 * The rounded shape is the Minkowski sum of an inner box (half-extent
 * 0.5 - BEVEL_RADIUS) and a sphere of radius BEVEL_RADIUS: for any point P on
 * the flat unit-cube surface, clamp it to the inner box to get its nearest
 * point `c`, then push out by BEVEL_RADIUS along `normalize(P - c)`. This is
 * a pure function of P alone, so two faces' independently-generated grids
 * agree exactly at their shared boundary (no seam-specific stitching code),
 * and it degenerates correctly: one axis over the inner half → the flat face
 * unchanged; two axes over → a quarter-cylinder edge fillet; three axes
 * over → an eighth-sphere corner fillet. `normalize(P - c)` is also exactly
 * the surface normal at that point.
 */
import { ALL_AXES, perpendicularBasis } from "../../lib/physical-cube.ts";
import type { Vec } from "../../lib/cube.ts";

export const BEVEL_RADIUS = 0.03; // the small fillet on a piece's outer edges; faces are flat, not pillowed
const INNER_HALF = 0.5 - BEVEL_RADIUS;

// A uniform grid (SEGMENTS ~0.125 apart) under-samples a bevel band only
// BEVEL_RADIUS wide, faceting the fillet into two flat chords instead
// of a smooth curve. Sample each bevel band on its own with BEVEL_SEGMENTS
// steps, and the flat middle coarsely with INTERIOR_SEGMENTS steps.
export const BEVEL_SEGMENTS = 6;
const INTERIOR_SEGMENTS = 2;

export type MeshVertex = { readonly position: Vec; readonly normal: Vec };

const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (v: Vec, k: number): Vec => [v[0] * k, v[1] * k, v[2] * k];
const clampComp = (n: number) => Math.min(INNER_HALF, Math.max(-INNER_HALF, n));
const clamp = (v: Vec): Vec => [clampComp(v[0]), clampComp(v[1]), clampComp(v[2])];
const length = (v: Vec) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
const normalize = (v: Vec): Vec => scale(v, 1 / length(v));

// Every point on the flat cube's surface has at least one coordinate at
// ±0.5, which always exceeds INNER_HALF (BEVEL_RADIUS > 0), so `d` below is
// never the zero vector — no flat-region special case needed.
export function round(flatPoint: Vec): { position: Vec; normal: Vec } {
  const c = clamp(flatPoint);
  const d = sub(flatPoint, c);
  const normal = normalize(d);
  return { position: add(c, scale(normal, BEVEL_RADIUS)), normal };
}

function evenSteps(lo: number, hi: number, steps: number): number[] {
  return Array.from({ length: steps + 1 }, (_, i) => lo + ((hi - lo) * i) / steps);
}

// One axis's non-uniform partition of [-0.5, 0.5]: fine across each bevel
// band, coarse across the flat middle, with the shared boundary points
// (±INNER_HALF) deduplicated.
function axisSamples(): number[] {
  const left = evenSteps(-0.5, -INNER_HALF, BEVEL_SEGMENTS);
  const middle = evenSteps(-INNER_HALF, INNER_HALF, INTERIOR_SEGMENTS).slice(1, -1);
  const right = evenSteps(INNER_HALF, 0.5, BEVEL_SEGMENTS);
  return [...left, ...middle, ...right];
}

const SAMPLES = axisSamples();

function faceVertices(faceIndex: number): MeshVertex[] {
  const normal = ALL_AXES[faceIndex];
  const { column, row } = perpendicularBasis(normal);
  const center = scale(normal, 0.5);
  const flatPoint = (u: number, v: number): Vec => add(center, add(scale(column, u), scale(row, v)));
  const grid = SAMPLES.map((u) => SAMPLES.map((v) => round(flatPoint(u, v))));

  const vertices: MeshVertex[] = [];
  for (let i = 0; i < SAMPLES.length - 1; i++) {
    for (let j = 0; j < SAMPLES.length - 1; j++) {
      const c00 = grid[i][j];
      const c10 = grid[i + 1][j];
      const c11 = grid[i + 1][j + 1];
      const c01 = grid[i][j + 1];
      // column x row = normal (perpendicularBasis's construction guarantees
      // this), so walking u then v ascending is counterclockwise as seen
      // from the +normal side — the outside of the cubie, for every face.
      vertices.push(c00, c10, c11, c00, c11, c01);
    }
  }
  return vertices;
}

export function unitCubeVertices(): readonly MeshVertex[] {
  return ALL_AXES.flatMap((_, faceIndex) => faceVertices(faceIndex));
}
