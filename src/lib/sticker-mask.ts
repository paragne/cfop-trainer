import type { Color } from "./cube.ts";
import type { Mask } from "../data/algorithms.ts";

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

export function isKeptSticker(mask: Mask, pieceColors: readonly Color[], stickerColor: Color): boolean {
  const isLastLayerPiece = pieceColors.includes("U");
  const isCorner = pieceColors.length === 3;
  switch (mask.kind) {
    // The white cross (every D-layer edge, always solved and shown, plus
    // every non-U center for context) plus the one corner+edge pair being
    // practiced, wherever it currently sits. Every other D-layer corner,
    // every other E-slice edge, and the whole last layer stay gray. Whole
    // pieces are kept or not — `stickerColor` doesn't filter within one,
    // unlike every other mask kind below.
    case "f2l": {
      const side = mask.slot === "FR" ? "R" : "L";
      const isCenter = pieceColors.length === 1;
      const isCrossEdge = pieceColors.length === 2 && pieceColors.includes("D");
      const isTargetPiece =
        hasExactColors(pieceColors, ["D", "F", side]) || hasExactColors(pieceColors, ["F", side]);
      if (isLastLayerPiece) return false;
      if (isCenter) return true;
      return isCrossEdge || isTargetPiece;
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
