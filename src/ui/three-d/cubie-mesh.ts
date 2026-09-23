/**
 * The one unit-cube mesh every cubie is drawn with — 26 draw calls of the
 * same geometry, differing only by model matrix and per-cubie color
 * uniforms (see gl-scene.ts). Local space only: a face sits at ±0.5 along
 * its normal, matching "cubies are exactly 1 unit, no physical gaps" —
 * placement in the actual cube is entirely the model matrix's job.
 *
 * Face order matches physical-cube.ts's ALL_AXES exactly, so face index k
 * here always corresponds to cubie.faces[k] there; gl-scene.ts relies on
 * this to pick each vertex's color from the right face-color uniform.
 */
import { ALL_AXES, perpendicularBasis } from "../../lib/physical-cube.ts";
import type { Vec } from "../../lib/cube.ts";

export type MeshVertex = { readonly position: Vec; readonly uv: readonly [number, number]; readonly faceIndex: number };

const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (v: Vec, k: number): Vec => [v[0] * k, v[1] * k, v[2] * k];

// column x row = normal (perpendicularBasis's construction guarantees this;
// physical-cube.test.ts and cubie-mesh.test.ts both rely on it), so walking
// (u, v) from (0,0) to (1,0) to (1,1) is counterclockwise as seen from the
// +normal side — the outside of the cubie for every one of its 6 faces.
function faceVertices(faceIndex: number): MeshVertex[] {
  const normal = ALL_AXES[faceIndex];
  const { column, row } = perpendicularBasis(normal);
  const center = scale(normal, 0.5);
  const corner = (u: number, v: number): Vec => add(center, add(scale(column, u - 0.5), scale(row, v - 0.5)));
  const at = (u: number, v: number): MeshVertex => ({ position: corner(u, v), uv: [u, v], faceIndex });
  const c00 = at(0, 0);
  const c10 = at(1, 0);
  const c11 = at(1, 1);
  const c01 = at(0, 1);
  return [c00, c10, c11, c00, c11, c01];
}

// 6 faces * 2 triangles * 3 vertices, non-indexed.
export function unitCubeVertices(): readonly MeshVertex[] {
  return ALL_AXES.flatMap((_, faceIndex) => faceVertices(faceIndex));
}
