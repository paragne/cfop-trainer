import type { Color } from "./cube.ts";

// Neon speedcube palette (reference/gan_cube_color_reference.jpg carried the
// chirality; these exact hex values are the requested ones, not sampled).
// Shared by the 2D SVG renderer and the 3D WebGL renderer, so a case looks
// the same color scheme in both.
export const FILL: Record<Color, string> = {
  U: "#fff200", D: "#ffffff", F: "#00f064", B: "#1f6fff", R: "#ff7300", L: "#ff1e3c",
};

// The masked/gray fill, for a sticker a case's mask hides.
export const GRAY = "#8a8f98";

// #rrggbb, 0-255 per channel, to 0-1 floats for a GLSL uniform.
export function toRgb(hex: string): readonly [number, number, number] {
  return [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255) as [number, number, number];
}
