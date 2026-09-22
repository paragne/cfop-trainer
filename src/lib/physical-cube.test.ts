import { describe, expect, it } from "vitest";
import { applyMoves, SOLVED } from "./cube.ts";
import { parse } from "./notation.ts";
import { applyMovePhysical, colorsAt, homeStickers } from "./physical-cube.ts";
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
