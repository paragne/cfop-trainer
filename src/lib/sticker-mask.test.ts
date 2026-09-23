import { describe, expect, it } from "vitest";
import { isKeptSticker } from "./sticker-mask.ts";
import type { Mask } from "../data/algorithms.ts";

const FR: Mask = { kind: "f2l", slot: "FR" };
const FL: Mask = { kind: "f2l", slot: "FL" };

describe("isKeptSticker: f2l", () => {
  it("keeps every sticker of the target corner and edge, wherever they are", () => {
    // Every sticker keeps, regardless of the third argument: a whole piece
    // is kept or not, unlike every other mask kind.
    expect(isKeptSticker(FR, ["D", "F", "R"], "D")).toBe(true);
    expect(isKeptSticker(FR, ["D", "F", "R"], "F")).toBe(true);
    expect(isKeptSticker(FR, ["D", "F", "R"], "R")).toBe(true);
    expect(isKeptSticker(FR, ["F", "R"], "F")).toBe(true);
    expect(isKeptSticker(FR, ["F", "R"], "R")).toBe(true);
  });

  it("keeps every D-layer edge (the white cross), fully, not just the target slot", () => {
    expect(isKeptSticker(FR, ["D", "F"], "D")).toBe(true);
    expect(isKeptSticker(FR, ["D", "F"], "F")).toBe(true);
    expect(isKeptSticker(FR, ["D", "B"], "B")).toBe(true); // opposite side, still cross
    expect(isKeptSticker(FR, ["D", "L"], "L")).toBe(true); // the other slot's cross edge
  });

  it("grays a non-target D-layer corner entirely, unlike the previous rule", () => {
    // The DFL corner under an FR mask: not the target, not a 2-sticker
    // cross edge (it has 3 stickers), so none of it is kept anymore.
    expect(isKeptSticker(FR, ["D", "F", "L"], "D")).toBe(false);
    expect(isKeptSticker(FR, ["D", "F", "L"], "F")).toBe(false);
    expect(isKeptSticker(FR, ["D", "F", "L"], "L")).toBe(false);
  });

  it("grays a non-target E-slice edge entirely", () => {
    expect(isKeptSticker(FR, ["F", "L"], "F")).toBe(false);
    expect(isKeptSticker(FR, ["B", "L"], "B")).toBe(false);
  });

  it("never keeps a last-layer piece, even one that would otherwise qualify", () => {
    // A UFR corner isn't a 2-sticker D-layer edge and isn't {D,F,side}
    // exactly (it has a U sticker too), so it's excluded either way — but
    // the isLastLayerPiece check comes first regardless.
    expect(isKeptSticker(FR, ["U", "F", "R"], "F")).toBe(false);
    expect(isKeptSticker(FR, ["U", "F", "R"], "U")).toBe(false);
  });

  it("keeps every non-U center, including ones that aren't D/F/side", () => {
    expect(isKeptSticker(FR, ["D"], "D")).toBe(true);
    expect(isKeptSticker(FR, ["F"], "F")).toBe(true);
    expect(isKeptSticker(FR, ["R"], "R")).toBe(true);
    expect(isKeptSticker(FR, ["L"], "L")).toBe(true);
    expect(isKeptSticker(FR, ["B"], "B")).toBe(true);
  });

  it("grays the U center", () => {
    expect(isKeptSticker(FR, ["U"], "U")).toBe(false);
  });

  it("uses L instead of R for an FL slot's target pair, but the cross is the same either way", () => {
    expect(isKeptSticker(FL, ["D", "F", "L"], "L")).toBe(true);
    expect(isKeptSticker(FL, ["D", "F", "R"], "R")).toBe(false);
    expect(isKeptSticker(FL, ["D", "R"], "R")).toBe(true);
  });
});

describe("isKeptSticker: oll/pll", () => {
  it("oll-edges keeps only a last-layer edge or center's own U sticker", () => {
    const mask: Mask = { kind: "oll-edges" };
    expect(isKeptSticker(mask, ["U", "F"], "U")).toBe(true);
    expect(isKeptSticker(mask, ["U", "F"], "F")).toBe(false);
    expect(isKeptSticker(mask, ["U", "F", "R"], "U")).toBe(false); // corner
    expect(isKeptSticker(mask, ["U"], "U")).toBe(true); // center
    expect(isKeptSticker(mask, ["D", "F"], "F")).toBe(false); // not last layer
  });

  it("oll-full keeps every last-layer piece's own U sticker, corners included", () => {
    const mask: Mask = { kind: "oll-full" };
    expect(isKeptSticker(mask, ["U", "F", "R"], "U")).toBe(true);
    expect(isKeptSticker(mask, ["U", "F", "R"], "F")).toBe(false);
  });

  it("pll-corners keeps whole corners but only an edge's U sticker", () => {
    const mask: Mask = { kind: "pll-corners" };
    expect(isKeptSticker(mask, ["U", "F", "R"], "F")).toBe(true);
    expect(isKeptSticker(mask, ["U", "F"], "U")).toBe(true);
    expect(isKeptSticker(mask, ["U", "F"], "F")).toBe(false);
  });

  it("pll-full keeps every last-layer sticker", () => {
    const mask: Mask = { kind: "pll-full" };
    expect(isKeptSticker(mask, ["U", "F", "R"], "F")).toBe(true);
    expect(isKeptSticker(mask, ["D", "F", "R"], "F")).toBe(false);
  });
});
