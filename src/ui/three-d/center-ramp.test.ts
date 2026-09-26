import { describe, expect, it } from "vitest";
import type { Vec } from "../../lib/cube.ts";
import { pieceVertices } from "./piece-mesh.ts";
import { CENTER_PLATEAU_DIAMETER, CENTER_RAMP_DEPTH, FACE_INSET, rampDepth } from "./piece-shape.ts";

const CORNER: Vec = [1, 1, 1];
// The up-front edge: its front face is one of the two it shows.
const EDGE: Vec = [0, 1, 1];
const CENTER: Vec = [0, 0, 1];
const TOP = 0.5 - FACE_INSET;
const SEAM = 0.5;

// Height of a piece's +z face at (x, y), read off the nearest vertex that faces
// mostly up.
function heightAt(home: Vec, x: number, y: number): number {
  const up = pieceVertices(home).filter((v) => v.normal[2] > 0.3);
  const nearest = up.reduce((best, v) =>
    Math.hypot(v.position[0] - x, v.position[1] - y) < Math.hypot(best.position[0] - x, best.position[1] - y) ? v : best,
  );
  return nearest.position[2];
}

describe("rampDepth, the center's ramp over a cube face", () => {
  it("is flat on the plateau and away from the center", () => {
    expect(rampDepth(0, 0)).toBe(0);
    expect(rampDepth(CENTER_PLATEAU_DIAMETER / 2 - 0.01, 0)).toBe(0);
    expect(rampDepth(0, 1)).toBe(0);
    expect(rampDepth(1, 1)).toBe(0);
  });

  it("falls CENTER_RAMP_DEPTH by the seam round the center, mid-side and toward the corners alike", () => {
    expect(rampDepth(SEAM, 0)).toBeCloseTo(CENTER_RAMP_DEPTH);
    expect(rampDepth(0, -SEAM)).toBeCloseTo(CENTER_RAMP_DEPTH);
    expect(rampDepth(0.4, SEAM)).toBeCloseTo(CENTER_RAMP_DEPTH);
  });

  it("runs short mid-side and long toward a corner", () => {
    const halfway = CENTER_RAMP_DEPTH / 4;
    const midSide = [0.44, 0.45, 0.46, 0.47, 0.48].find((x) => rampDepth(x, 0) > halfway) ?? 1;
    const diagonal = [0.44, 0.46, 0.48, 0.5, 0.52, 0.54, 0.56].find((d) => rampDepth(d / Math.SQRT2, d / Math.SQRT2) > halfway) ?? 1;
    expect(diagonal - CENTER_PLATEAU_DIAMETER / 2).toBeGreaterThan(2 * (midSide - CENTER_PLATEAU_DIAMETER / 2));
  });

  it.each([0, 0.2, 0.35])("mirrors across the seam at %s along it: same height, slope reversed", (along) => {
    const h = 1e-4;
    const inside = rampDepth(along, SEAM - 0.005);
    const outside = rampDepth(along, SEAM + 0.005);
    // The mirror runs along the ray from the face's middle, not square to the
    // seam, so off-axis these two points agree to first order only.
    expect(outside).toBeCloseTo(inside, 3);
    const slopeIn = (rampDepth(along, SEAM - h) - rampDepth(along, SEAM - 2 * h)) / h;
    const slopeOut = (rampDepth(along, SEAM + 2 * h) - rampDepth(along, SEAM + h)) / h;
    expect(slopeOut).toBeCloseTo(-slopeIn, 1);
  });
});

describe("the center", () => {
  it("fills its tile: flat-topped near the middle of each side, not notched like the stickered one", () => {
    expect(heightAt(CENTER, 0.46, 0.46)).toBeGreaterThan(TOP - CENTER_RAMP_DEPTH - 0.02);
    expect(heightAt(CENTER, 0, 0)).toBeCloseTo(TOP, 3);
  });

  it("dips toward its corners but not on its plateau", () => {
    expect(heightAt(CENTER, 0.3, 0)).toBeCloseTo(TOP, 3);
    expect(heightAt(CENTER, 0.43, 0.43)).toBeLessThan(TOP - 0.025);
  });

  // 0.02 from the seam the center is already about 0.03 down, so a neighbour
  // left flat would miss by that much; sampling on the steep ramp costs a few
  // thousandths.
  it("meets its edge neighbour at the same height across the seam", () => {
    for (const along of [0, 0.15]) {
      const center = heightAt(CENTER, along, SEAM - 0.02);
      const edge = heightAt(EDGE, along, -(SEAM - 0.02));
      expect(center).toBeLessThan(TOP - 0.02);
      expect(Math.abs(center - edge)).toBeLessThan(0.008);
    }
  });
});

describe("the cube's outer edges", () => {
  // 0.03 in from a face's edge: inside a 0.06 outer roll, past a 0.03 seam bevel.
  const IN = 0.465;

  it("round more than the seams", () => {
    expect(heightAt(CORNER, IN, 0)).toBeLessThan(TOP - 0.005);
    expect(heightAt(CORNER, 0, IN)).toBeLessThan(TOP - 0.005);
    expect(heightAt(EDGE, 0, IN)).toBeLessThan(TOP - 0.005);
    expect(heightAt(EDGE, IN, 0)).toBeGreaterThan(TOP - 0.002);
  });
});
