import type { Color } from "../../lib/cube.ts";

// Brighter speedcube palette (reference/gan_cube_color_reference.jpg carried
// the chirality; these exact hex values are the requested ones, not sampled).
export const FILL: Record<Color, string> = {
  U: "#ffe500", D: "#ffffff", F: "#00d65a", B: "#1e6bff", R: "#ff7a00", L: "#ff2d2d",
};

// #rrggbb, 0-255 per channel, to 0-1 floats for a GLSL uniform.
export function toRgb(hex: string): readonly [number, number, number] {
  return [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255) as [number, number, number];
}
