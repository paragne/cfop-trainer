import { describe, expect, it } from "vitest";
import { ALL_AXES } from "../../lib/physical-cube.ts";
import type { Vec } from "../../lib/cube.ts";
import { BEVEL_RADIUS, BEVEL_SEGMENTS, round, unitCubeVertices } from "./cubie-mesh.ts";
import type { MeshVertex } from "./cubie-mesh.ts";

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const length = (v: Vec) => Math.hypot(...v);
const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const angleBetweenDeg = (a: Vec, b: Vec) => (Math.acos(Math.min(1, Math.max(-1, dot(a, b)))) * 180) / Math.PI;

const CELL_VERTICES = 6; // c00, c10, c11, c00, c11, c01 — see cubie-mesh.ts

describe("unitCubeVertices", () => {
  const vertices = unitCubeVertices();
  const perFace = vertices.length / 6;

  it("keeps every local vertex within the unit cube", () => {
    for (const v of vertices) for (const c of v.position) expect(Math.abs(c)).toBeLessThanOrEqual(0.5 + 1e-9);
  });

  it("gives every vertex a unit-length normal", () => {
    for (const v of vertices) expect(length(v.normal)).toBeCloseTo(1);
  });

  it.each(ALL_AXES.map((axis, i): [string, Vec, number] => [axis.join(","), axis, i]))(
    "winds both triangles of every grid cell on face %s counterclockwise as seen from outside",
    (_label, _axis, faceIndex) => {
      const face = vertices.slice(faceIndex * perFace, (faceIndex + 1) * perFace);
      for (let i = 0; i < face.length; i += CELL_VERTICES) {
        for (const [p0, p1, p2] of [
          [face[i], face[i + 1], face[i + 2]],
          [face[i + 3], face[i + 4], face[i + 5]],
        ]) {
          const faceNormal = cross(sub(p1.position, p0.position), sub(p2.position, p0.position));
          // Reference "outside" by the triangle's own averaged vertex
          // normals, not a fixed face axis: on a curved (beveled) region the
          // true outward direction tilts away from the flat face's axis.
          const outward: Vec = [
            p0.normal[0] + p1.normal[0] + p2.normal[0],
            p0.normal[1] + p1.normal[1] + p2.normal[1],
            p0.normal[2] + p1.normal[2] + p2.normal[2],
          ];
          expect(dot(faceNormal, outward)).toBeGreaterThan(0);
        }
      }
    },
  );
});

describe("round", () => {
  it("leaves a flat-face-center point unchanged, with the face's own axis as normal", () => {
    const { position, normal } = round([0.5, 0, 0]);
    expect(position).toEqual([0.5, 0, 0]);
    expect(normal).toEqual([1, 0, 0]);
  });

  it("places a cube-corner point exactly BEVEL_RADIUS from the inner box's corner", () => {
    const innerHalf = 0.5 - BEVEL_RADIUS;
    const { position } = round([0.5, -0.5, 0.5]);
    expect(length(sub(position, [innerHalf, -innerHalf, innerHalf]))).toBeCloseTo(BEVEL_RADIUS);
  });

  it("places an edge point exactly BEVEL_RADIUS from the inner box's edge line", () => {
    const innerHalf = 0.5 - BEVEL_RADIUS;
    const { position } = round([0.5, 0.2, 0.5]);
    // The edge line runs along Y at fixed (x, z) = (innerHalf, innerHalf); Y
    // is untouched by clamping since it never exceeds innerHalf here.
    expect(position[1]).toBeCloseTo(0.2);
    expect(Math.hypot(position[0] - innerHalf, position[2] - innerHalf)).toBeCloseTo(BEVEL_RADIUS);
  });
});

// A uniform SEGMENTS grid would space vertices ~0.125 apart against a bevel
// band only BEVEL_RADIUS (0.1) wide, faceting the fillet into two chords.
// The non-uniform per-axis sampling in cubie-mesh.ts spends BEVEL_SEGMENTS
// steps per bevel band instead, so adjacent-normal steps should stay close
// to a single quarter-circle divided across both faces that share it: each
// face's own bevel band covers half of the 90° fillet (the other half is the
// neighbouring face's own band), so BEVEL_SEGMENTS steps span 45°, nominally
// 90 / (2 * BEVEL_SEGMENTS) degrees per step. That average isn't the worst
// step, though: within a single-axis (edge, not corner) sweep the swept
// angle is atan(x) for x stepped evenly from 0 to 1, and atan's slope
// 1 / (1 + x^2) is twice as steep at x=0 as at x=1, so the first step is
// close to double the mean and corner cells (both in-plane axes in their own
// bevel band at once) add further coupling on top of that — hence "plus a
// tolerance" rather than a bare average bound.
describe("bevel sampling density", () => {
  it(`keeps adjacent-vertex-normal steps within ${90 / (2 * BEVEL_SEGMENTS)} degrees plus a tolerance, across every grid cell`, () => {
    const vertices = unitCubeVertices();
    let maxStepDeg = 0;
    for (let i = 0; i < vertices.length; i += CELL_VERTICES) {
      const [c00, c10, c11, , , c01] = vertices.slice(i, i + CELL_VERTICES) as [
        MeshVertex,
        MeshVertex,
        MeshVertex,
        MeshVertex,
        MeshVertex,
        MeshVertex,
      ];
      maxStepDeg = Math.max(
        maxStepDeg,
        angleBetweenDeg(c00.normal, c10.normal),
        angleBetweenDeg(c00.normal, c01.normal),
        angleBetweenDeg(c10.normal, c11.normal),
        angleBetweenDeg(c01.normal, c11.normal),
      );
    }
    const nominal = 90 / (2 * BEVEL_SEGMENTS);
    const tolerance = nominal; // covers the atan(x) non-uniformity and corner coupling documented above
    expect(maxStepDeg).toBeLessThanOrEqual(nominal + tolerance);
  });
});
