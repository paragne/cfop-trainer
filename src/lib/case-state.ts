import { applyMoves, normalize, PIECES, SOLVED } from "./cube.ts";
import type { Color, Cube } from "./cube.ts";
import { invert, parse } from "./notation.ts";
import type { Case, Mask } from "../data/algorithms.ts";

export type Facelet = Color | "masked";
export type CaseState = readonly Facelet[];

const SIDE: Record<"FR" | "FL", Color> = { FR: "R", FL: "L" };

// F2L is intact in every OLL and PLL case, so the last layer is whatever
// occupies the U layer's positions.
const LAST_LAYER = PIECES.filter((piece) => piece.some((i) => i < 9));

// The centers stay in every last-layer mask: without one, oll-cross-dot would
// render as an all-gray cube.
function keptIndices(cube: Cube, mask: Mask): number[] {
  switch (mask.kind) {
    case "f2l": {
      // Found by color in the normalized state, not by tracking the home slot
      // through the moves: after a d or y' the pieces that were moved are not
      // the pair the solver sees.
      const side = SIDE[mask.slot];
      const pair = [
        ["D", "F", side],
        ["F", side],
      ];
      return PIECES.filter((piece) =>
        pair.some(
          (colors) =>
            colors.length === piece.length &&
            colors.every((color) => piece.some((i) => cube[i] === color)),
        ),
      ).flat();
    }
    case "oll-edges":
      return LAST_LAYER.filter((piece) => piece.length !== 3)
        .flat()
        .filter((i) => cube[i] === "U");
    case "oll-full":
      return LAST_LAYER.flat().filter((i) => cube[i] === "U");
    case "pll-corners":
      return LAST_LAYER.filter((piece) => piece.length !== 2).flat();
    case "pll-full":
      return LAST_LAYER.flat();
  }
}

export function setupCube(c: Case): Cube {
  const setup =
    c.setup === null ? invert(parse(c.algs[0].moves)) : parse(c.setup);
  return normalize(applyMoves(SOLVED, setup));
}

export function caseState(c: Case): CaseState {
  const cube = setupCube(c);
  const kept = new Set(keptIndices(cube, c.mask));
  return cube.map((color, i): Facelet => (kept.has(i) ? color : "masked"));
}
