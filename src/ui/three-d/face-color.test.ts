import { describe, expect, it } from "vitest";
import type { Vec } from "../../lib/cube.ts";
import { nearestVisibleFace } from "./face-color.ts";

// A URF-style corner: U, R, F stickered; D, L, B hidden.
const CORNER = [
  { normal: [0, 1, 0] as Vec, color: "U" as const },
  { normal: [1, 0, 0] as Vec, color: "R" as const },
  { normal: [0, 0, 1] as Vec, color: "F" as const },
];

// A UR-style edge: U, R stickered; D, L, F, B hidden.
const EDGE = [
  { normal: [0, 1, 0] as Vec, color: "U" as const },
  { normal: [1, 0, 0] as Vec, color: "R" as const },
];

// A U-style center: only U stickered.
const CENTER = [{ normal: [0, 1, 0] as Vec, color: "U" as const }];

describe("nearestVisibleFace on a corner", () => {
  it.each([
    ["+X, its own sticker", [0.5, 0.1, -0.2], "R"],
    ["+Y, its own sticker", [0.1, 0.5, -0.2], "U"],
    ["+Z, its own sticker", [-0.2, 0.1, 0.5], "F"],
    ["-X hidden, biased toward U", [-0.5, 0.3, 0.1], "U"],
    ["-X hidden, biased toward F", [-0.5, 0.1, 0.3], "F"],
    ["-Y hidden, biased toward R", [0.3, -0.5, 0.1], "R"],
    ["-Y hidden, biased toward F", [0.1, -0.5, 0.3], "F"],
    ["-Z hidden, biased toward U", [0.1, 0.3, -0.5], "U"],
    ["-Z hidden, biased toward R", [0.3, 0.1, -0.5], "R"],
  ] as const)("%s -> %s", (_label, point, expected) => {
    expect(nearestVisibleFace(point as Vec, CORNER)).toBe(expected);
  });
});

describe("nearestVisibleFace on an edge", () => {
  it.each([
    ["+Y, its own sticker", [0.1, 0.5, 0.2], "U"],
    ["+X, its own sticker", [0.5, 0.1, 0.2], "R"],
    ["-Y hidden, touches only R (U is opposite)", [0.1, -0.5, 0.3], "R"],
    ["-X hidden, touches only U (R is opposite)", [-0.5, 0.1, 0.3], "U"],
    ["+Z hidden, touches both, biased toward U", [0.1, 0.3, 0.5], "U"],
    ["+Z hidden, touches both, biased toward R", [0.3, 0.1, 0.5], "R"],
    ["-Z hidden, touches both, biased toward U", [0.1, 0.3, -0.5], "U"],
    ["-Z hidden, touches both, biased toward R", [0.3, 0.1, -0.5], "R"],
  ] as const)("%s -> %s", (_label, point, expected) => {
    expect(nearestVisibleFace(point as Vec, EDGE)).toBe(expected);
  });
});

describe("nearestVisibleFace on a center", () => {
  const points: Vec[] = [
    [0.5, 0.1, 0.1],
    [-0.5, 0.1, 0.1],
    [0.1, 0.5, 0.1],
    [0.1, -0.5, 0.1],
    [0.1, 0.1, 0.5],
    [0.1, 0.1, -0.5],
  ];

  it.each(points.map((point): [Vec] => [point]))("every face is solid U, since it is the only visible face (%j)", (point) => {
    expect(nearestVisibleFace(point, CENTER)).toBe("U");
  });
});
