import { describe, expect, it } from "vitest";
import { MOVE_AXES } from "../../lib/cube.ts";
import type { Vec } from "../../lib/cube.ts";
import { invert, parse } from "../../lib/notation.ts";
import type { Move } from "../../lib/notation.ts";
import { animationAngleDegrees } from "../../lib/rotate-by-angle.ts";
import { transformPoint } from "../../lib/mat4.ts";
import type { Mat4 } from "../../lib/mat4.ts";
import { applyMoveToCubies, homeCubies } from "../../lib/physical-cube.ts";
import type { PhysicalCubie } from "../../lib/physical-cube.ts";
import { ALL_CASES } from "../../data/algorithms.ts";
import { animatedModelMatrix, bakedModelMatrix, cubieRotation } from "./cubie-model.ts";

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const matClose = (a: Mat4, b: Mat4) => a.every((n, i) => Math.abs(n - b[i]) < 1e-9);

describe("cubieRotation", () => {
  it("is the identity for every home cubie", () => {
    for (const cubie of homeCubies()) {
      expect(matClose(cubieRotation(cubie), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])).toBe(true);
    }
  });
});

describe("bakedModelMatrix", () => {
  it("places a home cubie's own position with identity orientation", () => {
    const cubie = homeCubies().find((c) => c.position[0] === 1 && c.position[1] === 1 && c.position[2] === 1);
    if (cubie === undefined) throw new Error("URF corner not found");
    expect(transformPoint(bakedModelMatrix(cubie), [0, 0, 0])).toEqual([1, 1, 1]);
  });
});

// The critical correctness property: the last frame of an animated move must
// look exactly like the baked state after that move, for every moving cubie.
// This is what proves animationAngleDegrees' sign is right, not just its
// magnitude — a sign error would send a cubie the wrong way around and this
// would fail, even though a symmetric-looking mid-animation frame might not
// visibly betray it.
const MOVES: readonly Move[] = [
  { name: "U", turns: 1, prime: false },
  { name: "U", turns: 1, prime: true },
  { name: "R", turns: 2, prime: false },
  { name: "M", turns: 1, prime: false },
  { name: "r", turns: 1, prime: false },
  { name: "y", turns: 1, prime: false },
];

describe("animatedModelMatrix at full progress", () => {
  it.each(MOVES.map((m): [string, Move] => [`${m.name}${m.turns === 2 ? "2" : ""}${m.prime ? "'" : ""}`, m]))(
    "equals bakedModelMatrix after applyMoveToCubies for %s",
    (_label, move) => {
      const before = homeCubies();
      const after = applyMoveToCubies(before, move);
      const { axis, depths } = MOVE_AXES[move.name];
      const angle = animationAngleDegrees(move);
      before.forEach((cubie, i) => {
        if (!depths.includes(dot(axis, cubie.position))) return;
        expect(matClose(animatedModelMatrix(cubie, axis, angle), bakedModelMatrix(after[i]))).toBe(true);
      });
    },
  );
});

// Rotation about the origin preserves a point's distance from the origin, at
// every angle — not just at rest and at the end. A per-axis [-1.5, 1.5] box
// bound only holds at those two endpoints: a corner cubie mid-turn sweeps
// outside that box in the plane perpendicular to the turn axis. The sphere
// bound is the one that is always true.
const MAX_RADIUS = 1.5 * Math.sqrt(3);
const LOCAL_CORNERS: readonly Vec[] = [
  [-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5],
  [-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [0.5, 0.5, 0.5],
];

function expectWithinBounds(model: Mat4, atRest: boolean): void {
  for (const corner of LOCAL_CORNERS) {
    const p = transformPoint(model, corner);
    expect(Math.hypot(...p)).toBeLessThanOrEqual(MAX_RADIUS + 1e-9);
    if (atRest) for (const c of p) expect(Math.abs(c)).toBeLessThanOrEqual(1.5 + 1e-9);
  }
}

describe("mesh vertex bounds", () => {
  it("stay within the cube at rest, for every home cubie", () => {
    for (const cubie of homeCubies()) expectWithinBounds(bakedModelMatrix(cubie), true);
  });

  it.each(MOVES.map((m): [string, Move] => [`${m.name}${m.turns === 2 ? "2" : ""}${m.prime ? "'" : ""}`, m]))(
    "stay within the sphere bound at every progress of %s",
    (_label, move) => {
      const cubies = homeCubies();
      const { axis, depths } = MOVE_AXES[move.name];
      const full = animationAngleDegrees(move);
      for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
        for (const cubie of cubies) {
          if (!depths.includes(dot(axis, cubie.position))) continue;
          expectWithinBounds(animatedModelMatrix(cubie, axis, full * progress), progress === 0 || progress === 1);
        }
      }
    },
  );
});

// Exercises cubieRotation's internal face-0-vs-the-other-five self-check
// broadly: every cubie, after every prefix of every preset's setup and
// solution, not just the handful of moves above. A pass here means the
// reconstruction never disagreed with itself across every move kind the
// data file actually uses (d, y', M-slices, wide r among them).
const PRESET_IDS = ["f2l-slot-3", "f2l-slot-4", "pll-h", "oll-24"];

function caseMoves(id: string): readonly Move[] {
  const found = ALL_CASES.find((c) => c.id === id);
  if (found === undefined) throw new Error(`Unknown case id: ${id}`);
  const solution = parse(found.algs[0].moves);
  return [...invert(solution), ...solution];
}

describe("cubieRotation self-check across presets", () => {
  it.each(PRESET_IDS)("does not throw for any cubie after any prefix of %s", (id) => {
    let cubies: readonly PhysicalCubie[] = homeCubies();
    for (const move of caseMoves(id)) {
      cubies = applyMoveToCubies(cubies, move);
      for (const cubie of cubies) expect(() => cubieRotation(cubie)).not.toThrow();
    }
  });
});
