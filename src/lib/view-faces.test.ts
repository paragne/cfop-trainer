import { describe, expect, it } from "vitest";
import { applyMoves, SOLVED } from "./cube.ts";
import { parse } from "./notation.ts";
import { viewFaces } from "./view-faces.ts";

const after = (moves: string) => applyMoves(SOLVED, parse(moves));

describe("viewFaces", () => {
  it("names the front-right view F, U, R on a cube nothing has turned", () => {
    expect(viewFaces(SOLVED, "FR")).toEqual({ top: "U", left: "F", right: "R" });
  });

  it("names the front-left view L, U, F", () => {
    expect(viewFaces(SOLVED, "FL")).toEqual({ top: "U", left: "L", right: "F" });
  });

  it("is unmoved by a layer turn, which never moves a center", () => {
    expect(viewFaces(after("R U R' U' F2 D L'"), "FR")).toEqual({ top: "U", left: "F", right: "R" });
  });

  it.each([
    ["y", { top: "U", left: "L", right: "F" }],
    ["y'", { top: "U", left: "R", right: "B" }],
    ["y2", { top: "U", left: "B", right: "L" }],
    ["x", { top: "B", left: "U", right: "R" }],
    ["x'", { top: "F", left: "D", right: "R" }],
    ["z", { top: "R", left: "F", right: "D" }],
  ])("after %s, reads %j", (rotation, want) => {
    expect(viewFaces(after(rotation), "FR")).toEqual(want);
  });

  it("follows a wide move's rotation, and a slice's", () => {
    expect(viewFaces(after("r"), "FR")).toEqual(viewFaces(after("x"), "FR"));
    expect(viewFaces(after("M"), "FR")).toEqual(viewFaces(after("x'"), "FR"));
  });

  it("returns to the start after four rotations", () => {
    expect(viewFaces(after("y y y y x x x x"), "FR")).toEqual(viewFaces(SOLVED, "FR"));
  });

  it("puts every face in exactly one of the three slots for any rotation, never repeating", () => {
    for (const moves of ["y", "x y", "z x'", "x2 y'", "y z2"]) {
      const { top, left, right } = viewFaces(after(moves), "FR");
      expect(new Set([top, left, right]).size).toBe(3);
    }
  });
});
