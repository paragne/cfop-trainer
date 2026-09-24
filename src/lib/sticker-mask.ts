import { PIECES, SOLVED } from "./cube.ts";
import type { Color, Cube } from "./cube.ts";
import type { Mask } from "../data/algorithms.ts";

// A case's Mask with what depends on its setup worked out once, at load: for
// F2L, which other F2L pieces the setup leaves out of place. Carried as piece
// identities, so the verdict below still never reads a position.
export type ShownMask =
  | Exclude<Mask, { kind: "f2l" }>
  | { kind: "f2l"; slot: "FR" | "FL"; displaced: readonly (readonly Color[])[] };

// Whether a sticker shows its real color under `mask` (false means gray),
// from the sticker's own color and its whole piece's current colors —
// never from position. A piece never splits across a move, so `pieceColors`
// is always some physical piece's complete, permanent color set, whether
// read off a flat facelet array's fixed slots (case-state.ts, since
// whichever piece occupies a slot is the one that owns the colors sitting
// there) or off a 3D PhysicalCubie's own faces directly. That's what lets
// this same rule be evaluated once per physical sticker and stay correct
// as the sticker moves during an animation, instead of being recomputed
// from wherever it currently sits.
// Exact color-set match (order-independent), for identifying one specific
// piece by its permanent identity — the D-layer cross edges and the F2L
// target pair are each found this way, never by position.
function hasExactColors(pieceColors: readonly Color[], colors: readonly Color[]): boolean {
  return pieceColors.length === colors.length && colors.every((c) => pieceColors.includes(c));
}

const isTargetPiece = (slot: "FR" | "FL", pieceColors: readonly Color[]) => {
  const side = slot === "FR" ? "R" : "L";
  return hasExactColors(pieceColors, ["D", "F", side]) || hasExactColors(pieceColors, ["F", side]);
};

// An F2L piece is a D-layer corner or an E-slice edge. `cube` is the
// normalized setup, and a piece is displaced when its own home slot does not
// hold it solved. The target pair is left out, since it is always kept.
export function showMask(mask: Mask, cube: Cube): ShownMask {
  if (mask.kind !== "f2l") return mask;
  const displaced = PIECES.flatMap((piece) => {
    const home = piece.map((i) => SOLVED[i]);
    const isF2lPiece = piece.length > 1 && !home.includes("U") && !(piece.length === 2 && home.includes("D"));
    if (!isF2lPiece || isTargetPiece(mask.slot, home)) return [];
    return piece.every((i) => cube[i] === SOLVED[i]) ? [] : [home];
  });
  return { ...mask, displaced };
}

export function isKeptSticker(mask: ShownMask, pieceColors: readonly Color[], stickerColor: Color): boolean {
  const isLastLayerPiece = pieceColors.includes("U");
  const isCorner = pieceColors.length === 3;
  switch (mask.kind) {
    // The white cross (every D-layer edge, always solved and shown, plus
    // every non-U center for context), the one corner+edge pair being
    // practiced, wherever it currently sits, and any other F2L piece the
    // setup displaced: with the target in a back slot, those are what keep
    // the picture recognizable. Solved F2L pieces and the whole last layer
    // stay gray. Whole pieces are kept or not — `stickerColor` doesn't filter
    // within one, unlike every other mask kind below.
    case "f2l": {
      const isCenter = pieceColors.length === 1;
      const isCrossEdge = pieceColors.length === 2 && pieceColors.includes("D");
      if (isLastLayerPiece) return false;
      if (isCenter) return true;
      return (
        isCrossEdge ||
        isTargetPiece(mask.slot, pieceColors) ||
        mask.displaced.some((colors) => hasExactColors(pieceColors, colors))
      );
    }
    case "oll-edges":
      return isLastLayerPiece && !isCorner && stickerColor === "U";
    case "oll-full":
      return isLastLayerPiece && stickerColor === "U";
    case "pll-corners":
      return isLastLayerPiece && (isCorner || stickerColor === "U");
    case "pll-full":
      return isLastLayerPiece;
  }
}
