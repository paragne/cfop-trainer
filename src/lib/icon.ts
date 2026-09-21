import { SOLVED } from "./cube.ts";
import { LOGO_PALETTE } from "./logo.ts";
import { cellsFor, STROKE, STROKE_WIDTH } from "./render.ts";

type Point = readonly [number, number];
type Rgb = readonly [number, number, number];
type Cell = { corners: Point[]; fill: Rgb; low: Point; high: Point };

// The cube fills this share of the icon, leaving the margin a home-screen icon
// needs.
const FILL_SHARE = 0.7;
// Samples per axis per pixel, for smooth edges.
const SAMPLES = 4;

const channel = (hex: string, at: number) => parseInt(hex.slice(at, at + 2), 16);
const rgb = (hex: string): Rgb => [channel(hex, 1), channel(hex, 3), channel(hex, 5)];

const cross = (a: Point, b: Point, p: Point) =>
  (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

// Every cell is convex, so a point is inside when it is on one side of all edges.
function inside(corners: Point[], p: Point): boolean {
  const sides = corners.map((a, i) => cross(a, corners[(i + 1) % corners.length], p));
  return sides.every((s) => s >= 0) || sides.every((s) => s <= 0);
}

function nearEdge(corners: Point[], p: Point, reach: number): boolean {
  return corners.some((a, i) => {
    const b = corners[(i + 1) % corners.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy)) <= reach;
  });
}

// The apple-touch-icon: the logo's own polygons rasterized by hand, since an
// SVG cannot serve as one and the build has no image library. Cells are painted
// in order with their outline, as the SVG does.
export function iconRgb(size: number, background: string): Uint8Array {
  const { viewBox, cells: layout } = cellsFor("iso-fr");
  const [left, top, width, height] = viewBox.split(" ").map(Number);
  const scale = (size * FILL_SHARE) / Math.max(width, height);
  const reach = STROKE_WIDTH / 2;
  const stroke = rgb(STROKE);
  const back = rgb(background);

  const cells = layout.map(({ index, points }): Cell => {
    const corners = points.split(" ").map((pair): Point => {
      const [x, y] = pair.split(",").map(Number);
      return [x, y];
    });
    const xs = corners.map(([x]) => x);
    const ys = corners.map(([, y]) => y);
    return {
      corners,
      fill: rgb(LOGO_PALETTE[SOLVED[index]]),
      low: [Math.min(...xs) - reach, Math.min(...ys) - reach],
      high: [Math.max(...xs) + reach, Math.max(...ys) + reach],
    };
  });

  const colorAt = (p: Point): Rgb => {
    let color = back;
    for (const cell of cells) {
      if (p[0] < cell.low[0] || p[0] > cell.high[0] || p[1] < cell.low[1] || p[1] > cell.high[1]) continue;
      if (inside(cell.corners, p)) color = cell.fill;
      if (nearEdge(cell.corners, p, reach)) color = stroke;
    }
    return color;
  };

  const centerX = left + width / 2;
  const centerY = top + height / 2;
  const out = new Uint8Array(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const px = x + (sx + 0.5) / SAMPLES;
          const py = y + (sy + 0.5) / SAMPLES;
          const color = colorAt([centerX + (px - size / 2) / scale, centerY + (py - size / 2) / scale]);
          for (let c = 0; c < 3; c++) sum[c] += color[c];
        }
      }
      for (let c = 0; c < 3; c++) out[(y * size + x) * 3 + c] = Math.round(sum[c] / SAMPLES ** 2);
    }
  }
  return out;
}
