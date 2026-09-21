import { describe, expect, it } from "vitest";
import { iconRgb } from "./icon.ts";
import { LOGO_PALETTE } from "./logo.ts";

const SIZE = 180;
const BACKGROUND = "#0b0b0c";

const at = (pixels: Uint8Array, x: number, y: number) => {
  const i = (y * SIZE + x) * 3;
  return [pixels[i], pixels[i + 1], pixels[i + 2]];
};

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

const pixels = iconRgb(SIZE, BACKGROUND);

const count = (hex: string) => {
  const want = rgb(hex);
  let n = 0;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) if (at(pixels, x, y).every((v, c) => v === want[c])) n++;
  }
  return n;
};

// The rows and columns holding anything but background.
function extent() {
  const back = rgb(BACKGROUND);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (at(pixels, x, y).some((v, c) => v !== back[c])) {
        xs.push(x);
        ys.push(y);
      }
    }
  }
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

describe("iconRgb", () => {
  it("returns opaque RGB for every pixel", () => {
    expect(pixels).toHaveLength(SIZE * SIZE * 3);
    expect(iconRgb(60, BACKGROUND)).toHaveLength(60 * 60 * 3);
  });

  it("leaves the corners as background", () => {
    for (const [x, y] of [[0, 0], [SIZE - 1, 0], [0, SIZE - 1], [SIZE - 1, SIZE - 1]]) {
      expect(at(pixels, x, y)).toEqual(rgb(BACKGROUND));
    }
  });

  it("paints the three faces in the logo's colors, in equal measure", () => {
    const areas = [LOGO_PALETTE.U, LOGO_PALETTE.F, LOGO_PALETTE.R].map(count);
    expect(Math.min(...areas)).toBeGreaterThan(2000);
    expect(Math.max(...areas) / Math.min(...areas)).toBeLessThan(1.05);
  });

  // The share is of the view box, which carries a few units of padding.
  it("centers the cube and gives it about two thirds of the icon", () => {
    const { left, right, top, bottom } = extent();
    expect(Math.abs(left - (SIZE - 1 - right))).toBeLessThanOrEqual(2);
    expect(Math.abs(top - (SIZE - 1 - bottom))).toBeLessThanOrEqual(2);
    const span = Math.max(right - left, bottom - top) + 1;
    expect(span / SIZE).toBeGreaterThan(0.66);
    expect(span / SIZE).toBeLessThan(0.72);
  });

  it("draws the dark outline between stickers", () => {
    expect(count("#1a1a1a")).toBeGreaterThan(50);
  });
});
