import { describe, expect, it } from "vitest";
import { FACE_GEOMETRY, faceNormal } from "./cube.ts";
import type { Color, Vec } from "./cube.ts";

const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const scale = (v: Vec, k: number): Vec => [v[0] * k, v[1] * k, v[2] * k];
// `+ 0` turns -0 into 0, which toEqual would otherwise tell apart.
const clean = (v: readonly number[]) => v.map((x) => x + 0);

// Outward normal and the direction that is "up" on screen, as SPEC reads each
// face: sides head-on with U on top, U from above with B on top, D from below
// with F on top. Written as literals so the table is checked against the
// spec, not against itself.
const READING: [Color, Vec, Vec][] = [
  ["U", [0, 1, 0], [0, 0, -1]],
  ["R", [1, 0, 0], [0, 1, 0]],
  ["F", [0, 0, 1], [0, 1, 0]],
  ["D", [0, -1, 0], [0, 0, 1]],
  ["L", [-1, 0, 0], [0, 1, 0]],
  ["B", [0, 0, -1], [0, 1, 0]],
];

describe("FACE_GEOMETRY", () => {
  it.each(READING)("%s: outward normal", (face, normal) => {
    expect(clean(faceNormal(face))).toEqual(normal);
  });

  // Screen-right is up x outward for a viewer looking at the face.
  it.each(READING)("%s: columns run left to right", (face, normal, up) => {
    expect(clean(FACE_GEOMETRY[face].column)).toEqual(clean(cross(up, normal)));
  });

  it.each(READING)("%s: rows run top to bottom", (face, _, up) => {
    expect(clean(FACE_GEOMETRY[face].row)).toEqual(clean(scale(up, -1)));
  });

  // With the steps pinned, this fixes the origin: the 3x3 grid is centered on
  // the face, which sits 1.5 out from the cube's center.
  it.each(READING)("%s: the grid is centered on the face", (face, normal) => {
    const { origin, column, row } = FACE_GEOMETRY[face];
    const center = origin.map((o, k) => o + 1.5 * column[k] + 1.5 * row[k]);
    expect(clean(center)).toEqual(clean(scale(normal, 1.5)));
  });
});
