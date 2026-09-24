import { describe, expect, it } from "vitest";
import { applyMoves, SOLVED } from "./cube.ts";
import { parse } from "./notation.ts";
import { isKeptSticker, showMask } from "./sticker-mask.ts";
import type { ShownMask } from "./sticker-mask.ts";

const FR: ShownMask = { kind: "f2l", slot: "FR", displaced: [] };
const FL: ShownMask = { kind: "f2l", slot: "FL", displaced: [] };

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

  it("grays a solved non-target D-layer corner entirely", () => {
    // The DFL corner under an FR mask with nothing displaced: not the
    // target, not a 2-sticker cross edge (it has 3 stickers), so none of it
    // is kept.
    expect(isKeptSticker(FR, ["D", "F", "L"], "D")).toBe(false);
    expect(isKeptSticker(FR, ["D", "F", "L"], "F")).toBe(false);
    expect(isKeptSticker(FR, ["D", "F", "L"], "L")).toBe(false);
  });

  it("grays a solved non-target E-slice edge entirely", () => {
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

  it("keeps a displaced F2L piece whole, and only that one", () => {
    const mask: ShownMask = { ...FR, displaced: [["D", "F", "L"]] };
    expect(isKeptSticker(mask, ["L", "D", "F"], "D")).toBe(true);
    expect(isKeptSticker(mask, ["L", "D", "F"], "L")).toBe(true);
    expect(isKeptSticker(mask, ["D", "B", "L"], "B")).toBe(false);
    expect(isKeptSticker(mask, ["F", "L"], "F")).toBe(false);
  });
});

describe("showMask", () => {
  const sorted = (mask: ShownMask) =>
    mask.kind === "f2l" ? mask.displaced.map((colors) => colors.toSorted().join("")).toSorted() : null;
  // Takes the FL pair out of its slot and leaves everything else in F2L solved.
  const flOut = applyMoves(SOLVED, parse("L' U L"));

  it("displaces nothing when only the target is unsolved", () => {
    expect(sorted(showMask({ kind: "f2l", slot: "FL" }, flOut))).toEqual([]);
    expect(sorted(showMask({ kind: "f2l", slot: "FR" }, SOLVED))).toEqual([]);
  });

  it("names every other F2L piece the setup moved, by its home colors", () => {
    expect(sorted(showMask({ kind: "f2l", slot: "FR" }, flOut))).toEqual(["DFL", "FL"]);
  });

  it("never lists a cross edge, which is kept anyway", () => {
    const crossOut = applyMoves(SOLVED, parse("F"));
    expect(sorted(showMask({ kind: "f2l", slot: "FR" }, crossOut))).toEqual(["DFL", "FL"]);
  });

  it("passes a last-layer mask through unchanged", () => {
    expect(showMask({ kind: "pll-full" }, flOut)).toEqual({ kind: "pll-full" });
  });
});

describe("isKeptSticker: oll/pll", () => {
  it("oll-edges keeps only a last-layer edge or center's own U sticker", () => {
    const mask: ShownMask = { kind: "oll-edges" };
    expect(isKeptSticker(mask, ["U", "F"], "U")).toBe(true);
    expect(isKeptSticker(mask, ["U", "F"], "F")).toBe(false);
    expect(isKeptSticker(mask, ["U", "F", "R"], "U")).toBe(false); // corner
    expect(isKeptSticker(mask, ["U"], "U")).toBe(true); // center
    expect(isKeptSticker(mask, ["D", "F"], "F")).toBe(false); // not last layer
  });

  it("oll-full keeps every last-layer piece's own U sticker, corners included", () => {
    const mask: ShownMask = { kind: "oll-full" };
    expect(isKeptSticker(mask, ["U", "F", "R"], "U")).toBe(true);
    expect(isKeptSticker(mask, ["U", "F", "R"], "F")).toBe(false);
  });

  it("pll-corners keeps whole corners but only an edge's U sticker", () => {
    const mask: ShownMask = { kind: "pll-corners" };
    expect(isKeptSticker(mask, ["U", "F", "R"], "F")).toBe(true);
    expect(isKeptSticker(mask, ["U", "F"], "U")).toBe(true);
    expect(isKeptSticker(mask, ["U", "F"], "F")).toBe(false);
  });

  it("pll-full keeps every last-layer sticker", () => {
    const mask: ShownMask = { kind: "pll-full" };
    expect(isKeptSticker(mask, ["U", "F", "R"], "F")).toBe(true);
    expect(isKeptSticker(mask, ["D", "F", "R"], "F")).toBe(false);
  });
});
