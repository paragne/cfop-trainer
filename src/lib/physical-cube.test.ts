import { describe, expect, it } from "vitest";
import { applyMoves, MOVE_AXES, SOLVED } from "./cube.ts";
import { parse } from "./notation.ts";
import { applyMovePhysical, colorsAt, cutPlaneDepths, homeStickers, surfacePosition } from "./physical-cube.ts";
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

describe("cutPlaneDepths", () => {
  it("gives a face turn one cut plane, at the boundary with the rest", () => {
    expect(cutPlaneDepths(MOVE_AXES.R.depths)).toEqual([0.5]);
  });

  it("gives a wide move one cut plane, at its far boundary", () => {
    expect(cutPlaneDepths(MOVE_AXES.r.depths)).toEqual([-0.5]);
  });

  it("gives a slice two cut planes, sandwiched between two stationary layers", () => {
    expect(cutPlaneDepths(MOVE_AXES.M.depths)).toEqual([-0.5, 0.5]);
  });

  it("gives a whole-cube rotation no cut planes — nothing stays behind", () => {
    expect(cutPlaneDepths(MOVE_AXES.x.depths)).toEqual([]);
    expect(cutPlaneDepths(MOVE_AXES.y.depths)).toEqual([]);
    expect(cutPlaneDepths(MOVE_AXES.z.depths)).toEqual([]);
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
