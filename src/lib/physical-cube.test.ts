import { describe, expect, it } from "vitest";
import { applyMoves, SOLVED } from "./cube.ts";
import { parse } from "./notation.ts";
import {
  applyAlgToCubies,
  applyMovePhysical,
  applyMoveToCubies,
  colorsAt,
  colorsAtCubies,
  homeCubies,
  homeStickers,
  surfacePosition,
} from "./physical-cube.ts";
import { ALL_CASES } from "../data/algorithms.ts";

describe("homeStickers", () => {
  it("matches SOLVED", () => {
    expect(colorsAt(homeStickers())).toEqual(SOLVED);
  });

  it("returns home after a move applied 4 times", () => {
    let stickers = homeStickers();
    for (let i = 0; i < 4; i++) {
      stickers = applyMovePhysical(stickers, { name: "R", turns: 1, prime: false });
    }
    expect(colorsAt(stickers)).toEqual(SOLVED);
  });
});

describe("surfacePosition", () => {
  it("sits half a cubie further out than the cubie-center position, along normal", () => {
    const uCenter = homeStickers().find(
      (s) => s.position[0] === 0 && s.position[1] === 1 && s.position[2] === 0,
    );
    if (uCenter === undefined) throw new Error("U center not found");
    expect(uCenter.position).toEqual([0, 1, 0]);
    expect(surfacePosition(uCenter)).toEqual([0, 1.5, 0]);
  });
});

describe("homeCubies", () => {
  it("matches SOLVED", () => {
    expect(colorsAtCubies(homeCubies())).toEqual(SOLVED);
  });

  it("gives every cubie exactly 6 faces, sticker-counted by piece kind", () => {
    for (const cubie of homeCubies()) {
      expect(cubie.faces).toHaveLength(6);
      const zeros = cubie.position.filter((n) => n === 0).length;
      const expectedStickers = 3 - zeros; // corner 3, edge 2, center 1
      expect(cubie.faces.filter((f) => f.isSticker)).toHaveLength(expectedStickers);
    }
  });

  it("gives a center's non-sticker faces its own single color", () => {
    const uCenter = homeCubies().find((c) => c.position[0] === 0 && c.position[1] === 1 && c.position[2] === 0);
    if (uCenter === undefined) throw new Error("U center not found");
    for (const face of uCenter.faces) expect(face.colors).toEqual(["U"]);
  });

  it("gives a corner's hidden faces the color of its own axis's sticker", () => {
    const corner = homeCubies().find((c) => c.position[0] === 1 && c.position[1] === 1 && c.position[2] === 1);
    if (corner === undefined) throw new Error("URF corner not found");
    const byAxis = new Map(corner.faces.map((f) => [f.normal.join(","), f.colors]));
    expect(byAxis.get("1,0,0")).toEqual(byAxis.get("-1,0,0"));
    expect(byAxis.get("0,1,0")).toEqual(byAxis.get("0,-1,0"));
    expect(byAxis.get("0,0,1")).toEqual(byAxis.get("0,0,-1"));
  });

  it("splits an edge's one un-stickered axis between its two colors, and mirrors its own two stickers solid", () => {
    const edge = homeCubies().find((c) => c.position[0] === 1 && c.position[1] === 1 && c.position[2] === 0);
    if (edge === undefined) throw new Error("UR edge not found");
    const hidden = edge.faces.filter((f) => !f.isSticker);
    expect(hidden).toHaveLength(4);
    const split = hidden.filter((f) => f.colors.length === 2);
    const solid = hidden.filter((f) => f.colors.length === 1);
    expect(split).toHaveLength(2);
    for (const face of split) expect(face.colors.toSorted()).toEqual(["R", "U"]);
    expect(solid).toHaveLength(2);
    expect(solid.map((f) => f.colors[0]).toSorted()).toEqual(["R", "U"]);
  });
});

// Every alg of every case in the data file, not just the four preset algs:
// this is what proves the physical tracker agrees with the engine on `d`,
// `y'`, M-slices and wide `r` as part of proving it for everything, not as a
// special case.
const ALGS: [string, string][] = ALL_CASES.flatMap((c) =>
  c.algs.map((a): [string, string] => [`${c.id} (${a.moves})`, a.moves]),
);

describe("applyMovePhysical", () => {
  it.each(ALGS)(
    "keeps colorsAt in sync with applyMoves after every prefix of %s",
    (_label, movesText) => {
      const moves = parse(movesText);
      let stickers = homeStickers();
      let expected = SOLVED;
      for (const move of moves) {
        stickers = applyMovePhysical(stickers, move);
        expected = applyMoves(expected, [move]);
        expect(colorsAt(stickers)).toEqual(expected);
      }
    },
  );
});

// Proves applyMoveToCubies against the already-proven applyMovePhysical
// (rather than a second copy of the exhaustive applyMoves comparison above):
// a per-cubie body's sticker faces must read the same colors as the flat
// tracker after every prefix of every case's algorithm.
describe("applyMoveToCubies", () => {
  it.each(ALGS)("keeps colorsAtCubies in sync with applyMovePhysical after every prefix of %s", (_label, movesText) => {
    const moves = parse(movesText);
    let stickers = homeStickers();
    let cubies = homeCubies();
    for (const move of moves) {
      stickers = applyMovePhysical(stickers, move);
      cubies = applyMoveToCubies(cubies, move);
      expect(colorsAtCubies(cubies)).toEqual(colorsAt(stickers));
    }
  });

  it("agrees with applyAlgToCubies over the whole sequence at once", () => {
    const moves = parse(ALGS[0][1]);
    const stepwise = moves.reduce(applyMoveToCubies, homeCubies());
    expect(colorsAtCubies(applyAlgToCubies(homeCubies(), moves))).toEqual(colorsAtCubies(stepwise));
  });
});
