import { describe, expect, it } from "vitest";
import { FILL, toRgb } from "./palette.ts";

// Bands rather than hex values, so this is not the color map restated — see
// render.test.ts's identical approach for the v1 SVG palette, which this
// file intentionally duplicates rather than shares: the two palettes are
// independent and allowed to diverge.
function hsl(hex: string) {
  const [r, g, b] = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const sector = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: d === 0 ? 0 : sector * 60, s, l };
}

function colorName(hex: string) {
  const { h, s, l } = hsl(hex);
  if (s < 0.1) return l > 0.9 ? "white" : "gray";
  if (h >= 340 || h < 10) return "red";
  if (h >= 15 && h < 40) return "orange";
  if (h >= 45 && h < 70) return "yellow";
  if (h >= 90 && h < 170) return "green";
  if (h >= 190 && h < 250) return "blue";
  return `hue ${Math.round(h)}`;
}

describe("3D palette", () => {
  it.each([
    ["U", "D", "yellow", "white"],
    ["F", "B", "green", "blue"],
    ["R", "L", "orange", "red"],
  ] as const)("%s and %s, opposite faces, are %s and %s", (a, b, x, y) => {
    expect([colorName(FILL[a]), colorName(FILL[b])].toSorted()).toEqual([x, y].toSorted());
  });

  // Opposite pairs alone pass for R red and L orange, which is a mirror-image cube.
  it("has orange on the right of a yellow-up, green-front cube", () => {
    expect((["U", "F", "R", "L"] as const).map((f) => colorName(FILL[f]))).toEqual([
      "yellow",
      "green",
      "orange",
      "red",
    ]);
  });
});

describe("toRgb", () => {
  it("normalizes 0-255 hex channels to 0-1", () => {
    expect(toRgb("#ff7a00")).toEqual([1, 122 / 255, 0]);
  });
});
