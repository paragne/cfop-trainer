import { describe, expect, it } from "vitest";
import { F2L_CASES } from "../data/algorithms.ts";
import { caseState, setupCube } from "./case-state.ts";
import type { CaseState } from "./case-state.ts";
import { PIECES, SOLVED } from "./cube.ts";
import { BASIC_MASKS } from "./f2l-mask-basic.fixture.ts";

const BASIC = F2L_CASES.filter((c) => c.sets.includes("F2L"));

const colored = (state: CaseState) =>
  state.flatMap((facelet, i) => (facelet === "masked" ? [] : [i]));

// Only these can fail on a bad case or a bad mask tag. A check that the alg
// solves the colored stickers is left out on purpose: the alg solves the whole
// cube, so every mask would pass it.
describe("F2L masks", () => {
  it.each(F2L_CASES)("$id: a colored sticker is out of place", (c) => {
    const state = caseState(c);
    expect(
      state.some((facelet, i) => facelet !== "masked" && facelet !== SOLVED[i]),
    ).toBe(true);
  });

  // Restates the rule independently (found by color and position, not by
  // calling case-state.ts's own code): the white cross (every D-layer edge,
  // by color, plus every non-U center), the target pair, and every other
  // piece without a U sticker that is not solved where it sits — nothing
  // else.
  it.each(F2L_CASES)("$id: colors exactly the white cross, the target pair and every displaced F2L piece", (c) => {
    if (c.mask.kind !== "f2l") throw new Error(`${c.id} has no f2l mask`);
    const cube = setupCube(c);
    const state = caseState(c);
    const side = c.mask.slot === "FR" ? "R" : "L";

    const crossEdges = PIECES.filter((piece) => piece.length === 2 && piece.some((i) => cube[i] === "D"));
    const nonUCenters = PIECES.filter((piece) => piece.length === 1 && cube[piece[0]] !== "U");
    const pair = [
      ["D", "F", side],
      ["F", side],
    ];
    const targetPieces = PIECES.filter((piece) =>
      pair.some(
        (colors) => colors.length === piece.length && colors.every((color) => piece.some((i) => cube[i] === color)),
      ),
    );
    // A piece's home is where its colors are solved, so an F2L piece that
    // is out of place leaves some slot of F2L pieces unsolved.
    const homeOf = (piece: readonly number[]) =>
      PIECES.find((home) => home.length === piece.length && piece.every((i) => home.some((j) => SOLVED[j] === cube[i])));
    const displaced = PIECES.filter((piece) => {
      if (piece.length === 1 || piece.some((i) => cube[i] === "U")) return false;
      const home = homeOf(piece);
      if (home === undefined) throw new Error(`${c.id}: no home for piece ${piece}`);
      return home.some((j) => cube[j] !== SOLVED[j]);
    });
    const expected = [...new Set([...crossEdges, ...nonUCenters, ...targetPieces, ...displaced].flat())].toSorted(
      (a, b) => a - b,
    );

    expect(colored(state).toSorted((a, b) => a - b)).toEqual(expected);
  });

  // Every Basic case has only its target slot unsolved, so the cross, the
  // centers and the pair are all that is colored.
  it.each(BASIC)("$id: colors 18 stickers", (c) => {
    expect(colored(caseState(c))).toHaveLength(18);
  });

  // Frozen before the mask learned about displaced pieces: generalizing it
  // must not change a single Basic picture.
  it("colors every Basic case exactly as before the mask was generalized", () => {
    const now = Object.fromEntries(
      BASIC.map((c) => [c.id, caseState(c).map((f) => (f === "masked" ? "." : f)).join("")]),
    );
    expect(Object.keys(BASIC_MASKS).toSorted()).toEqual(BASIC.map((c) => c.id).toSorted());
    expect(now).toEqual(BASIC_MASKS);
  });
});
