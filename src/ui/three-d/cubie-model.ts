/**
 * Reconstructs a WebGL model matrix from a PhysicalCubie, without a second
 * decomposition of moves: this reads vectors physical-cube.ts already
 * rotated via MOVE_AXES/rotate(), it never re-derives which cubies move or
 * by how much. A cubie's orientation relative to home is always a pure
 * rotation about the origin (moves never translate a cubie independently of
 * that rotation), so `bakedModelMatrix` needs no persistent state of its own
 * — every frame reconstructs it fresh from whatever `cubies` currently is.
 */
import { fromColumns, multiply, rotationAboutAxis } from "../../lib/mat4.ts";
import type { Mat4 } from "../../lib/mat4.ts";
import type { Vec } from "../../lib/cube.ts";
import { ALL_AXES, perpendicularBasis } from "../../lib/physical-cube.ts";
import type { CubieFace, PhysicalCubie } from "../../lib/physical-cube.ts";

type Basis = { normal: Vec; column: Vec; row: Vec };

// perpendicularBasis(normal) depends only on normal, so this is the same
// triple for every cubie at a given face slot — computed once, not per cubie.
const HOME_BASIS: readonly Basis[] = ALL_AXES.map((normal) => ({ normal, ...perpendicularBasis(normal) }));

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const close = (a: Vec, b: Vec) => Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9 && Math.abs(a[2] - b[2]) < 1e-9;

// R*v, where R is the rotation that carries `home`'s basis onto `current`'s:
// express v in home's coordinates, then read those coordinates off current's
// basis. Avoids building or inverting a matrix for what is, per face, a
// change of orthonormal basis.
function applyRotation(home: Basis, current: Basis, v: Vec): Vec {
  const x = dot(home.column, v);
  const y = dot(home.row, v);
  const z = dot(home.normal, v);
  return [
    current.column[0] * x + current.row[0] * y + current.normal[0] * z,
    current.column[1] * x + current.row[1] * y + current.normal[1] * z,
    current.column[2] * x + current.row[2] * y + current.normal[2] * z,
  ];
}

// Reconstructed from face 0 alone, then checked against the other five: a
// disagreement means either physical-cube.ts's per-face rotation drifted
// out of sync with itself, or ALL_AXES' order no longer matches the mesh's
// — a programmer error either way, so this throws rather than rendering a
// silently wrong cubie.
function rotationColumns(cubie: PhysicalCubie): { colX: Vec; colY: Vec; colZ: Vec } {
  const home0 = HOME_BASIS[0];
  const current0 = cubie.faces[0];
  const colX = applyRotation(home0, current0, [1, 0, 0]);
  const colY = applyRotation(home0, current0, [0, 1, 0]);
  const colZ = applyRotation(home0, current0, [0, 0, 1]);

  for (let i = 1; i < 6; i++) {
    const home = HOME_BASIS[i];
    const current: CubieFace = cubie.faces[i];
    const predictedNormal = applyRotation(home0, current0, home.normal);
    const predictedColumn = applyRotation(home0, current0, home.column);
    const predictedRow = applyRotation(home0, current0, home.row);
    if (!close(predictedNormal, current.normal) || !close(predictedColumn, current.column) || !close(predictedRow, current.row)) {
      throw new Error(`cubieRotation: face ${i} disagrees with the rotation reconstructed from face 0`);
    }
  }

  return { colX, colY, colZ };
}

// Pure orientation, no translation — mostly useful for tests.
export function cubieRotation(cubie: PhysicalCubie): Mat4 {
  const { colX, colY, colZ } = rotationColumns(cubie);
  return fromColumns(colX, colY, colZ, [0, 0, 0]);
}

// The transform to draw a cubie at rest: its current orientation, translated
// to its current position.
export function bakedModelMatrix(cubie: PhysicalCubie): Mat4 {
  const { colX, colY, colZ } = rotationColumns(cubie);
  return fromColumns(colX, colY, colZ, cubie.position);
}

// Mid-animation: the turning layer's rotation, about the global axis through
// the origin, applied on top of wherever the cubie sat before this move
// started — never the cubie's own local origin, since that is not where
// layer turns pivot.
export function animatedModelMatrix(cubie: PhysicalCubie, axis: Vec, angleDeg: number): Mat4 {
  return multiply(rotationAboutAxis(axis, angleDeg), bakedModelMatrix(cubie));
}
