import { applyMoves, normalize, PIECES, SOLVED } from "./cube.ts";
import type { Color, Cube } from "./cube.ts";
import { invert, parse } from "./notation.ts";
import { isKeptSticker, showMask } from "./sticker-mask.ts";
import type { ShownMask } from "./sticker-mask.ts";
import type { Case } from "../data/algorithms.ts";

export type Facelet = Color | "masked";
export type CaseState = readonly Facelet[];

// A move never splits a piece's stickers across positions, so for any of
// PIECES' fixed slot groups, the colors currently sitting there are always
// exactly some one physical piece's own permanent color set — whichever
// piece currently occupies that slot.
function keptIndices(cube: Cube, mask: ShownMask): number[] {
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

// The 2D picture and the 3D view both mask with this, so they agree.
export const caseMask = (c: Case): ShownMask => showMask(c.mask, setupCube(c));

export function caseState(c: Case): CaseState {
  const cube = setupCube(c);
  const kept = new Set(keptIndices(cube, showMask(c.mask, cube)));
  return cube.map((color, i): Facelet => (kept.has(i) ? color : "masked"));
}
