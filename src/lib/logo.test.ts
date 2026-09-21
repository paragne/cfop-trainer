import { describe, expect, it } from "vitest";
import { SOLVED } from "./cube.ts";
import { logoSvg } from "./logo.ts";
import { renderCase } from "./render.ts";

const polygons = (svg: string) =>
  [...svg.matchAll(/<polygon data-i="(\d+)" points="([^"]+)" fill="(#[0-9a-f]{6})"\/>/g)].map(
    ([, index, points, fill]) => ({ index: Number(index), points, fill }),
  );

const fillsOf = (from: number, to: number) =>
  polygons(logoSvg())
    .filter(({ index }) => index >= from && index < to)
    .map(({ fill }) => fill);

describe("logoSvg", () => {
  it("draws a solved cube's three visible faces in three purples", () => {
    expect(polygons(logoSvg())).toHaveLength(27);
    expect(new Set(polygons(logoSvg()).map(({ fill }) => fill))).toEqual(
      new Set(["#c4b5fd", "#a78bfa", "#6d4fc4"]),
    );
  });

  it("puts lavender on top, violet on the left and the mid shade on the right", () => {
    expect(new Set(fillsOf(0, 9))).toEqual(new Set(["#c4b5fd"]));
    expect(new Set(fillsOf(18, 27))).toEqual(new Set(["#a78bfa"]));
    expect(new Set(fillsOf(9, 18))).toEqual(new Set(["#6d4fc4"]));
  });

  it("has exactly the geometry of an in-app F2L cube", () => {
    const app = polygons(renderCase(SOLVED, "iso-fr"));
    expect(polygons(logoSvg()).map(({ index, points }) => ({ index, points }))).toEqual(
      app.map(({ index, points }) => ({ index, points })),
    );
  });
});
