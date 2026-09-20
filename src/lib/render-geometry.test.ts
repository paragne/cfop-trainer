import { describe, expect, it } from "vitest";
import type { CaseState, Facelet } from "./case-state.ts";
import { PIECES, SOLVED } from "./cube.ts";
import { renderCase } from "./render.ts";
import type { View } from "./render.ts";

type Point = readonly [number, number];
type Cell = { index: number; points: Point[]; fill: string };

const POLYGON = /<polygon data-i="(\d+)" points="([^"]+)" fill="([^"]+)"\/>/g;

function cells(svg: string): Map<number, Cell> {
  return new Map(
    [...svg.matchAll(POLYGON)].map(([, i, pts, fill]) => [
      Number(i),
      {
        index: Number(i),
        fill,
        points: pts.split(" ").map((p): Point => {
          const [x, y] = p.split(",").map(Number);
          return [x, y];
        }),
      },
    ]),
  );
}

function at(drawn: Map<number, Cell>, index: number): Cell {
  const cell = drawn.get(index);
  if (cell === undefined) throw new Error(`facelet ${index} is not drawn`);
  return cell;
}

const close = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.011;
const shared = (a: Cell, b: Cell) => a.points.filter((p) => b.points.some((q) => close(p, q))).length;
const center = ({ points }: Cell): Point => [
  points.reduce((s, p) => s + p[0], 0) / points.length,
  points.reduce((s, p) => s + p[1], 0) / points.length,
];
const mean = (svg: Map<number, Cell>, from: number, to: number, axis: 0 | 1) => {
  const cs = Array.from({ length: to - from }, (_, k) => center(at(svg, from + k))[axis]);
  return cs.reduce((s, v) => s + v, 0) / cs.length;
};
const range = (from: number, to: number) => Array.from({ length: to - from }, (_, k) => from + k);
const draw = (view: View, state: CaseState = SOLVED) => cells(renderCase(state, view));

describe("drawn facelets", () => {
  it.each<[View, number[]]>([
    ["iso-fr", range(0, 27)],
    ["iso-fl", [...range(0, 9), ...range(18, 27), ...range(36, 45)]],
    ["top", [...range(0, 12), ...range(18, 21), ...range(36, 39), ...range(45, 48)]],
  ])("%s", (view, expected) => {
    expect([...draw(view).keys()].toSorted((a, b) => a - b)).toEqual(expected.toSorted((a, b) => a - b));
  });
});

// Stickers of one cubie meet along one sticker edge, so two of them share
// exactly two corners. Reversed rows or columns, or a wrong face origin, break it.
describe("isometric topology", () => {
  it.each<View>(["iso-fr", "iso-fl"])("%s: stickers of a piece share an edge", (view) => {
    const drawn = draw(view);
    const bad = PIECES.flatMap((piece) => {
      const on = piece.filter((i) => drawn.has(i));
      return on.flatMap((a, k) =>
        on.slice(k + 1).flatMap((b) => {
          const n = shared(at(drawn, a), at(drawn, b));
          return n === 2 ? [] : [`${a}-${b} share ${n}`];
        }),
      );
    });
    expect(bad).toEqual([]);
  });
});

// The top-row strips sit a gap away from U, so adjacency is read from centers:
// a strip is offset from its U sticker along one axis only, by less than a
// cell, and lies wholly outside the U square.
describe("top view topology", () => {
  it("puts each side sticker next to the U sticker of its piece", () => {
    const drawn = draw("top");
    const size = Math.abs(at(drawn, 0).points[1][0] - at(drawn, 0).points[0][0]);
    const u = range(0, 9).flatMap((i) => at(drawn, i).points);
    const [x0, x1] = [Math.min(...u.map((p) => p[0])), Math.max(...u.map((p) => p[0]))];
    const [y0, y1] = [Math.min(...u.map((p) => p[1])), Math.max(...u.map((p) => p[1]))];
    const outside = ([x, y]: Point) =>
      x <= x0 + 0.011 || x >= x1 - 0.011 || y <= y0 + 0.011 || y >= y1 - 0.011;
    const bad = PIECES.flatMap((piece) => {
      const onU = piece.find((i) => i < 9);
      if (onU === undefined) return [];
      return piece.filter((i) => i >= 9 && drawn.has(i)).flatMap((side) => {
        const [ux, uy] = center(at(drawn, onU));
        const [sx, sy] = center(at(drawn, side));
        const [along, across] = [Math.abs(sx - ux), Math.abs(sy - uy)].toSorted((a, b) => a - b);
        const beside = along < 0.011 && across > 0 && across < size;
        return beside && at(drawn, side).points.every(outside) ? [] : [`${onU} beside ${side}`];
      });
    });
    expect(bad).toEqual([]);
  });
});

// Adjacency survives a reflection, so a picture drawn as its own mirror image
// would pass the topology tests. These pin the handedness.
describe("orientation", () => {
  it("iso-fr: F on the left, R on the right, U on top", () => {
    const d = draw("iso-fr");
    expect(mean(d, 18, 27, 0)).toBeLessThan(mean(d, 9, 18, 0));
    expect(mean(d, 0, 9, 1)).toBeLessThan(mean(d, 18, 27, 1));
    expect(mean(d, 0, 9, 1)).toBeLessThan(mean(d, 9, 18, 1));
  });

  it("iso-fl: L on the left, F on the right, U on top", () => {
    const d = draw("iso-fl");
    expect(mean(d, 36, 45, 0)).toBeLessThan(mean(d, 18, 27, 0));
    expect(mean(d, 0, 9, 1)).toBeLessThan(mean(d, 18, 27, 1));
  });

  it("top: B above U, F below, L left, R right, U read left to right and top to bottom", () => {
    const d = draw("top");
    expect(mean(d, 45, 48, 1)).toBeLessThan(mean(d, 0, 9, 1));
    expect(mean(d, 18, 21, 1)).toBeGreaterThan(mean(d, 0, 9, 1));
    expect(mean(d, 36, 39, 0)).toBeLessThan(mean(d, 0, 9, 0));
    expect(mean(d, 9, 12, 0)).toBeGreaterThan(mean(d, 0, 9, 0));
    const [c0, c4, c8] = [0, 4, 8].map((i) => center(at(d, i)));
    expect(c0[0] < c4[0] && c0[1] < c4[1] && c4[0] < c8[0] && c4[1] < c8[1]).toBe(true);
  });
});

describe("slot at center front", () => {
  it.each<[View, number, number]>([
    ["iso-fr", 26, 15],
    ["iso-fl", 24, 44],
  ])("%s: the slot's vertical edge is on the vertical axis", (view, a, b) => {
    const d = draw(view);
    const edge = at(d, a).points.filter((p) => at(d, b).points.some((q) => close(p, q)));
    expect(edge).toHaveLength(2);
    expect(edge.every(([x]) => Math.abs(x) < 0.011)).toBe(true);
  });
});

// The mirror of index i across x = 0: swap R and L, reverse the columns.
const mirror = (i: number) =>
  [0, 4, 2, 3, 1, 5][Math.floor(i / 9)] * 9 + Math.floor((i % 9) / 3) * 3 + (2 - (i % 3));
const vertices = (points: Point[], flip: boolean) =>
  points.map(([x, y]) => `${(flip ? -x : x).toFixed(1)},${y.toFixed(1)}`).toSorted();

describe("FL camera", () => {
  it("is the FR camera reflected: each sticker sits where its mirror does, flipped in x", () => {
    const fr = draw("iso-fr");
    const bad = [...draw("iso-fl").values()].flatMap(({ index, points }) => {
      const twin = fr.get(mirror(index));
      return twin !== undefined && vertices(points, false).join() === vertices(twin.points, true).join()
        ? []
        : [index];
    });
    expect(bad).toEqual([]);
  });

  // The test above is about shapes only. A camera that read state[mirror(i)]
  // would draw the right shapes in the wrong colors.
  it("reads the state as it is", () => {
    const FACELETS: Facelet[] = ["U", "R", "F", "D", "L", "B", "masked"];
    const state = SOLVED.map((_, i): Facelet => FACELETS[(i * 5 + Math.floor(i / 3)) % 7]);
    const [fr, fl] = [draw("iso-fr", state), draw("iso-fl", state)];
    for (const i of [...range(0, 9), ...range(18, 27)]) {
      expect(at(fl, i).fill).toBe(at(fr, i).fill);
    }
  });
});
