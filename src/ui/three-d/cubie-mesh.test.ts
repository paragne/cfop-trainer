import { describe, expect, it } from "vitest";
import { ALL_AXES } from "../../lib/physical-cube.ts";
import type { Vec } from "../../lib/cube.ts";
import { unitCubeVertices } from "./cubie-mesh.ts";
import type { MeshVertex } from "./cubie-mesh.ts";

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

function trianglesOf(vertices: readonly MeshVertex[], faceIndex: number): MeshVertex[][] {
  const face = vertices.filter((v) => v.faceIndex === faceIndex);
  return [face.slice(0, 3), face.slice(3, 6)];
}

describe("unitCubeVertices", () => {
  const vertices = unitCubeVertices();

  it("has 6 faces of 2 triangles of 3 vertices", () => {
    expect(vertices).toHaveLength(36);
  });

  it("keeps every local vertex within the unit cube", () => {
    for (const v of vertices) for (const c of v.position) expect(Math.abs(c)).toBeLessThanOrEqual(0.5 + 1e-9);
  });

  it.each(ALL_AXES.map((axis, i): [string, Vec, number] => [axis.join(","), axis, i]))(
    "puts every vertex of face %s at 0.5 along that face's own normal",
    (_label, axis, faceIndex) => {
      const face = vertices.filter((v) => v.faceIndex === faceIndex);
      expect(face).toHaveLength(6);
      for (const v of face) expect(dot(v.position, axis)).toBeCloseTo(0.5);
    },
  );

  it.each(ALL_AXES.map((axis, i): [string, Vec, number] => [axis.join(","), axis, i]))(
    "winds both triangles of face %s counterclockwise as seen from outside (normal side)",
    (_label, axis, faceIndex) => {
      for (const [p0, p1, p2] of trianglesOf(vertices, faceIndex)) {
        const normal = cross(sub(p1.position, p0.position), sub(p2.position, p0.position));
        expect(dot(normal, axis)).toBeGreaterThan(0);
      }
    },
  );

  it("gives face UV corners (0,0), (1,0), (1,1), (0,0), (1,1), (0,1)", () => {
    const face = vertices.filter((v) => v.faceIndex === 0);
    expect(face.map((v) => v.uv)).toEqual([
      [0, 0], [1, 0], [1, 1],
      [0, 0], [1, 1], [0, 1],
    ]);
  });
});
