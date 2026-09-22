import { describe, expect, it } from "vitest";
import type { Vec } from "./cube.ts";
import type { MoveName } from "./notation.ts";
import { invert, parse } from "./notation.ts";
import { applyMovePhysical, homeStickers } from "./physical-cube.ts";
import type { PhysicalSticker } from "./physical-cube.ts";
import { matrix3d } from "./css-transform.ts";
import { ALL_CASES } from "../data/algorithms.ts";

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const length = (a: Vec) => Math.sqrt(dot(a, a));

// Parses the literal "matrix3d(a1,...,a16)" string scene.ts hands the
// browser and applies it exactly as CSS defines matrix3d: 16 values in
// column-major order, applied to a homogeneous [x,y,z,1] local point. This
// is not a reimplementation of matrix3d()'s own math — it independently
// re-derives what the browser would compute from the string it receives.
function applyMatrix3dString(css: string, local: Vec): Vec {
  const m = css.slice("matrix3d(".length, -1).split(",").map(Number);
  expect(m).toHaveLength(16);
  const [x, y, z] = local;
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

// CSS-local corners of the sticker's front face: y grows downward (CSS's
// own convention, independent of cube.ts's y-up), z=0.
const HALF = 0.45;
const LOCAL_CORNERS: readonly Vec[] = [
  [-HALF, -HALF, 0],
  [HALF, -HALF, 0],
  [HALF, HALF, 0],
  [-HALF, HALF, 0],
];

function corners(sticker: PhysicalSticker): Vec[] {
  const css = matrix3d(sticker.column, sticker.row, sticker.normal, sticker.position, 1);
  return LOCAL_CORNERS.map((local) => applyMatrix3dString(css, local));
}

// Every corner must lie exactly in the sticker's own plane (zero offset from
// position along normal), the four must form a square of the expected size
// centered on position, and — independent of the matrix entirely — a sticker
// that has only ever been rotated by 90° multiples about axis-aligned axes
// must have an axis-aligned normal: never a fin standing at some in-between
// angle.
function expectFlatSquareOnItsFace(sticker: PhysicalSticker): void {
  const axisAligned = sticker.normal.filter((n) => Math.abs(n) > 1e-9);
  expect(axisAligned).toHaveLength(1);
  expect(Math.abs(axisAligned[0])).toBeCloseTo(1);

  const cs = corners(sticker);
  for (const c of cs) {
    expect(Math.abs(dot(sub(c, sticker.position), sticker.normal))).toBeLessThan(1e-9);
  }
  const center: Vec = [
    (cs[0][0] + cs[1][0] + cs[2][0] + cs[3][0]) / 4,
    (cs[0][1] + cs[1][1] + cs[2][1] + cs[3][1]) / 4,
    (cs[0][2] + cs[1][2] + cs[2][2] + cs[3][2]) / 4,
  ];
  expect(length(sub(center, sticker.position))).toBeLessThan(1e-9);

  const edgeA = sub(cs[1], cs[0]);
  const edgeB = sub(cs[3], cs[0]);
  expect(length(edgeA)).toBeCloseTo(2 * HALF);
  expect(length(edgeB)).toBeCloseTo(2 * HALF);
  expect(Math.abs(dot(edgeA, edgeB))).toBeLessThan(1e-9);
}

function expectAllFlat(stickers: readonly PhysicalSticker[], label: string): void {
  stickers.forEach((s, i) => {
    try {
      expectFlatSquareOnItsFace(s);
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      throw new Error(`sticker ${i} (${label}) is not flat on its face: ${reason}`, { cause: e });
    }
  });
}

describe("every sticker's matrix3d places a flat square on its own face", () => {
  it("holds for the solved cube", () => {
    expectAllFlat(homeStickers(), "solved");
  });

  it.each<MoveName>(["U", "R", "F", "y"])("holds after a single %s", (name) => {
    const stickers = applyMovePhysical(homeStickers(), { name, turns: 1, prime: false });
    expectAllFlat(stickers, name);
  });

  it.each(ALL_CASES.map((c): [string, string] => [c.id, c.algs[0].moves]))(
    "holds after every prefix of %s's setup and solution",
    (id, movesText) => {
      const setup = invert(parse(movesText));
      const solution = parse(movesText);
      let stickers = homeStickers();
      for (const move of [...setup, ...solution]) {
        stickers = applyMovePhysical(stickers, move);
        expectAllFlat(stickers, `${id} mid-sequence`);
      }
    },
  );
});
