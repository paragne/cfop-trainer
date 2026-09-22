import { describe, expect, it } from "vitest";
import { applyMoves, normalize, SOLVED } from "./cube.ts";
import { invert, parse } from "./notation.ts";
import { homeRotation } from "./orientation.ts";
import { ALL_CASES } from "../data/algorithms.ts";

describe("homeRotation", () => {
  it("is a no-op on an already-home cube", () => {
    expect(homeRotation(SOLVED)).toEqual([]);
  });

  // A cube that is solved but held at an angle is always exactly reachable
  // from home by one whole-cube rotation, so a real rotation and normalize()
  // must agree there — this is the case SPEC's Verify feature needs (oll-42
  // leaves the solved cube's centers displaced, and needs the real rotation,
  // not a relabel, to show the expected state).
  it.each(["x", "x2", "x'", "y", "y2", "y'", "z", "z2", "z'", "x y", "z x y'"])(
    "matches normalize() for a solved cube rotated by %s",
    (rotationText) => {
      const cube = applyMoves(SOLVED, parse(rotationText));
      expect(applyMoves(cube, homeRotation(cube))).toEqual(normalize(cube));
    },
  );

  // A case setup is not solved, so it isn't guaranteed to be "home rotated by
  // X" at all: a partial-depth move (d, M, a wide move) can displace centers
  // in a way no single rigid rotation reproduces alongside the same corners
  // and edges (f2l-slot-3/4/5 and oll-42's setups all do). homeRotation still
  // must never throw, and must still bring the two centers it targets home,
  // for every case in the data file.
  it.each(ALL_CASES.map((c): [string, string] => [c.id, c.algs[0].moves]))(
    "brings U's and F's centers home for %s's setup",
    (_id, movesText) => {
      const cube = applyMoves(SOLVED, invert(parse(movesText)));
      const rotated = applyMoves(cube, homeRotation(cube));
      expect(rotated[4]).toBe("U");
      expect(rotated[22]).toBe("F");
    },
  );
});
