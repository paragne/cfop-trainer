import { describe, expect, it } from "vitest";
import type { Vec } from "../../lib/cube.ts";
import { pieceVertices } from "./piece-mesh.ts";

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

const CORNER: Vec = [1, 1, 1];
// The up-front edge: its front face is one of the two it shows.
const EDGE: Vec = [0, 1, 1];
const CENTER: Vec = [0, 0, 1];

// How far the flat part of a piece's +z face reaches toward the corner (sx, sy),
// measured along that diagonal: about 0.65 for a square corner, 0.59 for a round one.
function diagonalReach(home: Vec, sx: number, sy: number): number {
  const flat = pieceVertices(home).filter((v) => v.normal[2] > 0.99);
  return Math.max(...flat.map((v) => (sx * v.position[0] + sy * v.position[1]) / Math.SQRT2));
}

const SQUARE = 0.62;
const ROUND = 0.61;

describe("pieceVertices", () => {
  const all: readonly (readonly [string, Vec])[] = [
    ["a corner", CORNER],
    ["an edge", EDGE],
    ["a center", CENTER],
  ];

  it.each(all)("keeps every vertex of %s within the unit cube", (_name, home) => {
    for (const v of pieceVertices(home)) for (const c of v.position) expect(Math.abs(c)).toBeLessThanOrEqual(0.5 + 1e-9);
  });

  it.each(all)("gives every vertex of %s a unit normal that faces outward", (_name, home) => {
    for (const v of pieceVertices(home)) {
      expect(Math.hypot(...v.normal)).toBeCloseTo(1);
      expect(dot(v.normal, v.position)).toBeGreaterThan(0);
    }
  });

  it.each(all)("winds every triangle of %s counterclockwise seen from outside", (_name, home) => {
    const vertices = pieceVertices(home);
    for (let i = 0; i < vertices.length; i += 3) {
      const [a, b, c] = [vertices[i], vertices[i + 1], vertices[i + 2]];
      const facing = cross(sub(b.position, a.position), sub(c.position, a.position));
      if (Math.hypot(...facing) < 1e-12) continue;
      expect(dot(facing, a.normal)).toBeGreaterThan(0);
    }
  });

  it("leaves a flat face FACE_INSET inside the unit cube, the gap between real pieces", () => {
    const middle = pieceVertices(CENTER).filter((v) => v.normal[2] > 0.999 && Math.abs(v.position[0]) < 0.05 && Math.abs(v.position[1]) < 0.05);
    expect(middle.length).toBeGreaterThan(0);
    for (const v of middle) {
      expect(v.position[2]).toBeGreaterThan(0.49);
      expect(v.position[2]).toBeLessThan(0.5);
    }
  });
});

describe("the curve of a speedcube's pieces", () => {
  // Seen on the +z face, x to the right and y up. A corner is square where it
  // lies on the cube's outer boundary and rounded where it points to the
  // middle of the cube face.
  it("keeps a corner piece's outer corners square and rounds the one pointing inward", () => {
    expect(diagonalReach(CORNER, 1, 1)).toBeGreaterThan(SQUARE);
    expect(diagonalReach(CORNER, -1, 1)).toBeGreaterThan(SQUARE);
    expect(diagonalReach(CORNER, 1, -1)).toBeGreaterThan(SQUARE);
    expect(diagonalReach(CORNER, -1, -1)).toBeLessThan(ROUND);
  });

  it("rounds the two corners of an edge piece that point toward the middle of the face", () => {
    expect(diagonalReach(EDGE, 1, 1)).toBeGreaterThan(SQUARE);
    expect(diagonalReach(EDGE, -1, 1)).toBeGreaterThan(SQUARE);
    expect(diagonalReach(EDGE, 1, -1)).toBeLessThan(ROUND);
    expect(diagonalReach(EDGE, -1, -1)).toBeLessThan(ROUND);
  });

  it("rounds all four corners of a center", () => {
    for (const [sx, sy] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) expect(diagonalReach(CENTER, sx, sy)).toBeLessThan(ROUND);
  });
});
