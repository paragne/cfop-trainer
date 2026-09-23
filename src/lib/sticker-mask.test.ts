import { describe, expect, it } from "vitest";
import { isKeptSticker } from "./sticker-mask.ts";
import type { Mask } from "../data/algorithms.ts";

const FR: Mask = { kind: "f2l", slot: "FR" };
const FL: Mask = { kind: "f2l", slot: "FL" };

describe("isKeptSticker: f2l", () => {
  it("keeps every sticker of the target corner and edge", () => {
    expect(isKeptSticker(FR, ["D", "F", "R"], "D")).toBe(true);
    expect(isKeptSticker(FR, ["D", "F", "R"], "F")).toBe(true);
    expect(isKeptSticker(FR, ["D", "F", "R"], "R")).toBe(true);
    expect(isKeptSticker(FR, ["F", "R"], "F")).toBe(true);
    expect(isKeptSticker(FR, ["F", "R"], "R")).toBe(true);
  });

  it("keeps a different D-layer corner's D and matching-side stickers, but not its third", () => {
    // The DFL corner under an FR mask: D and F match, L doesn't.
    expect(isKeptSticker(FR, ["D", "F", "L"], "D")).toBe(true);
    expect(isKeptSticker(FR, ["D", "F", "L"], "F")).toBe(true);
    expect(isKeptSticker(FR, ["D", "F", "L"], "L")).toBe(false);
  });

  it("never keeps a last-layer piece's sticker, even one colored D/F/side", () => {
    // A UFR corner has an F sticker, which would match FR's allowed colors,
    // but the piece has a U sticker so the whole piece stays gray.
    expect(isKeptSticker(FR, ["U", "F", "R"], "F")).toBe(false);
    expect(isKeptSticker(FR, ["U", "F", "R"], "R")).toBe(false);
    expect(isKeptSticker(FR, ["U", "F", "R"], "U")).toBe(false);
  });

  it("keeps the D/F/side centers and grays the rest", () => {
    expect(isKeptSticker(FR, ["D"], "D")).toBe(true);
    expect(isKeptSticker(FR, ["F"], "F")).toBe(true);
    expect(isKeptSticker(FR, ["R"], "R")).toBe(true);
    expect(isKeptSticker(FR, ["L"], "L")).toBe(false);
    expect(isKeptSticker(FR, ["B"], "B")).toBe(false);
  });

  it("uses L instead of R for an FL slot", () => {
    expect(isKeptSticker(FL, ["D", "F", "L"], "L")).toBe(true);
    expect(isKeptSticker(FL, ["D", "F", "R"], "R")).toBe(false);
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
