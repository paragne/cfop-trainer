import { applyMoves, normalize, PIECES, SOLVED } from "./cube.ts";
import type { Color, Cube } from "./cube.ts";
import { invert, parse } from "./notation.ts";
import { isKeptSticker } from "./sticker-mask.ts";
import type { Case, Mask } from "../data/algorithms.ts";

export type Facelet = Color | "masked";
export type CaseState = readonly Facelet[];

// A move never splits a piece's stickers across positions, so for any of
// PIECES' fixed slot groups, the colors currently sitting there are always
// exactly some one physical piece's own permanent color set — whichever
// piece currently occupies that slot.
function keptIndices(cube: Cube, mask: Mask): number[] {
  return PIECES.flatMap((piece) => {
    const colors = piece.map((i) => cube[i]);
    return piece.filter((i) => isKeptSticker(mask, colors, cube[i]));
  });
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
