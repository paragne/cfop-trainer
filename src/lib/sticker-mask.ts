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
export function isKeptSticker(mask: Mask, pieceColors: readonly Color[], stickerColor: Color): boolean {
  const isLastLayerPiece = pieceColors.includes("U");
  const isCorner = pieceColors.length === 3;
  switch (mask.kind) {
    case "f2l": {
      const side = mask.slot === "FR" ? "R" : "L";
      return !isLastLayerPiece && (stickerColor === "D" || stickerColor === "F" || stickerColor === side);
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
