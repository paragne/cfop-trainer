import { describe, expect, it } from "vitest";
import type { Vec } from "./cube.ts";
import type { MoveName } from "./notation.ts";
import { invert, parse } from "./notation.ts";
import { applyMovePhysical, homeStickers, surfacePosition } from "./physical-cube.ts";
import type { PhysicalSticker } from "./physical-cube.ts";
import { ALL_CASES } from "../data/algorithms.ts";

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const length = (a: Vec) => Math.sqrt(dot(a, a));

// Local (u, v) offsets of the sticker's front face, in its own column/row
// basis: surfacePosition + u*column + v*row places each corner in world
// space, the same plane-placement fact matrix3d() used to encode as a CSS
// string before the WebGL rewrite — expressed directly as vector arithmetic
// now that there is no CSS string to round-trip through.
const HALF = 0.45;
const LOCAL_CORNERS: readonly [number, number][] = [
  [-HALF, -HALF],
  [HALF, -HALF],
  [HALF, HALF],
  [-HALF, HALF],
];

function corners(sticker: PhysicalSticker): Vec[] {
  const base = surfacePosition(sticker);
  return LOCAL_CORNERS.map(
    ([u, v]): Vec => [
      base[0] + u * sticker.column[0] + v * sticker.row[0],
      base[1] + u * sticker.column[1] + v * sticker.row[1],
      base[2] + u * sticker.column[2] + v * sticker.row[2],
    ],
  );
}

// Deliberately independent of sticker.position: checking a corner against
// "the plane through position" is satisfied by any consistently-wrong
// position, since it never compares against anything external. The cube's
// half-extent (1.5 cubie units) is the one fact this can check against
// instead — every corner must sit exactly on the surface at that radius
// along its own normal, and nowhere outside the cube at all.
function expectOnCubeSurface(sticker: PhysicalSticker): void {
  const axisAligned = sticker.normal.filter((n) => Math.abs(n) > 1e-9);
  expect(axisAligned).toHaveLength(1);
  expect(Math.abs(axisAligned[0])).toBeCloseTo(1);

  const cs = corners(sticker);
  for (const c of cs) {
    expect(Math.abs(dot(sticker.normal, c))).toBeCloseTo(1.5);
    for (const coord of c) {
      expect(coord).toBeGreaterThanOrEqual(-1.5 - 1e-9);
      expect(coord).toBeLessThanOrEqual(1.5 + 1e-9);
    }
  }

  // Still a square: adjacent edges equal length and perpendicular.
  const edgeA = sub(cs[1], cs[0]);
  const edgeB = sub(cs[3], cs[0]);
  expect(length(edgeA)).toBeCloseTo(2 * HALF);
  expect(length(edgeB)).toBeCloseTo(2 * HALF);
  expect(Math.abs(dot(edgeA, edgeB))).toBeLessThan(1e-9);
}

function expectAllOnSurface(stickers: readonly PhysicalSticker[], label: string): void {
  stickers.forEach((s, i) => {
    try {
      expectOnCubeSurface(s);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      throw new Error(`sticker ${i} (${label}) is not on the cube surface: ${reason}`, { cause: e });
    }
  });
}

describe("every sticker's column/row/normal places a flat square on the cube's outer surface", () => {
  it("holds for the solved cube", () => {
    expectAllOnSurface(homeStickers(), "solved");
  });

  it.each<MoveName>(["U", "R", "F", "y"])("holds after a single %s", (name) => {
    const stickers = applyMovePhysical(homeStickers(), { name, turns: 1, prime: false });
    expectAllOnSurface(stickers, name);
  });

  it.each(ALL_CASES.map((c): [string, string] => [c.id, c.algs[0].moves]))(
    "holds after every prefix of %s's setup and solution",
    (id, movesText) => {
      const setup = invert(parse(movesText));
      const solution = parse(movesText);
      let stickers = homeStickers();
      for (const move of [...setup, ...solution]) {
        stickers = applyMovePhysical(stickers, move);
        expectAllOnSurface(stickers, `${id} mid-sequence`);
      }
    },
  );
});
