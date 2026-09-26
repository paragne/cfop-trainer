import { describe, expect, it } from "vitest";
import { PROFILES } from "../../lib/aesthetic.ts";
import type { Vec } from "../../lib/cube.ts";
import { shadeSurface } from "./face-color.ts";

// A URF-style corner: U, R, F stickered; D, L, B hidden.
const CORNER = [
  { normal: [0, 1, 0] as Vec, color: "U" as const },
  { normal: [1, 0, 0] as Vec, color: "R" as const },
  { normal: [0, 0, 1] as Vec, color: "F" as const },
];

// The piece at the up-right-front corner of the solved cube.
const HOME: Vec = [1, 1, 1];
const RIGHT: Vec = [1, 0, 0];

describe("shadeSurface", () => {
  it("keeps Moyu's split: a hidden face takes the nearest sticker color", () => {
    expect(shadeSurface([-0.5, 0.3, 0.1], [-1, 0, 0], CORNER, PROFILES.moyu, HOME)).toBe("U");
    expect(shadeSurface([-0.5, 0.1, 0.3], [-1, 0, 0], CORNER, PROFILES.moyu, HOME)).toBe("F");
  });

  it.each([
    ["-X hidden, biased toward U", [-0.5, 0.3, 0.1], [-1, 0, 0]],
    ["-Y hidden", [0.1, -0.5, 0.3], [0, -1, 0]],
    ["-Z hidden", [0.3, 0.1, -0.5], [0, 0, -1]],
  ] as const)("GAN's %s is body, not a borrowed color", (_label, point, normal) => {
    expect(shadeSurface(point as Vec, normal as Vec, CORNER, PROFILES.gan, HOME)).toBe("body");
  });

  it("GAN colors a face by the way its surface faces, out to the bevel", () => {
    expect(shadeSurface([0.5, 0.1, -0.2], RIGHT, CORNER, PROFILES.gan, HOME)).toBe("R");
    expect(shadeSurface([0.47, 0.47, 0.1], [0.8, 0.6, 0], CORNER, PROFILES.gan, HOME)).toBe("R");
    expect(shadeSurface([0.47, 0.47, 0.1], [0.6, 0.8, 0], CORNER, PROFILES.gan, HOME)).toBe("U");
  });

  it("GAN keeps a face's color down its rolled edge into the gap, and only the wall below is body", () => {
    const facingGap: Vec = [-0.7, -0.7, 0.2];
    expect(shadeSurface([-0.42, -0.42, 0.45], facingGap, CORNER, PROFILES.gan, HOME)).toBe("F");
    expect(shadeSurface([-0.42, -0.42, 0.3], facingGap, CORNER, PROFILES.gan, HOME)).toBe("body");
  });

  it("Rubik's leaves the rolled edge black: it is plastic outside the sticker", () => {
    expect(shadeSurface([-0.42, -0.42, 0.45], [-0.7, -0.7, 0.2], CORNER, PROFILES.rubiks, HOME)).toBe("body");
  });

  it("Rubik's colors only inside the sticker, which follows the piece outline", () => {
    expect(shadeSurface([0.5, 0.1, -0.2], RIGHT, CORNER, PROFILES.rubiks, HOME)).toBe("R");
    expect(shadeSurface([0.5, 0.47, 0.0], RIGHT, CORNER, PROFILES.rubiks, HOME)).toBe("body");
    // The same offset from a corner: the outer corner is square, so it is still
    // sticker; the corner that points to the middle of the face is rounded off.
    expect(shadeSurface([0.5, 0.42, 0.42], RIGHT, CORNER, PROFILES.rubiks, HOME)).toBe("R");
    expect(shadeSurface([0.5, -0.42, -0.42], RIGHT, CORNER, PROFILES.rubiks, HOME)).toBe("body");
  });
});
