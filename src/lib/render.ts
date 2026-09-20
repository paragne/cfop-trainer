import { FACE_GEOMETRY, faceNormal, SOLVED } from "./cube.ts";
import type { Color, FaceGeometry, Vec } from "./cube.ts";
import type { CaseState, Facelet } from "./case-state.ts";
import type { Mask } from "../data/algorithms.ts";

export type View = "iso-fr" | "iso-fl" | "top";

type Point = readonly [number, number];
type Poly = { index: number; corners: Point[] };

// Yellow up, so every last-layer chart matches the ones this is compared with.
// Chirality is load-bearing: with U yellow and F green the right face is
// orange, not red. This is the standard scheme turned over with a z2, which
// swaps U/D and R/L and leaves F/B alone, so red ends up on the left. Keeping
// R red under a yellow U draws a mirror-image cube, and every PLL case would
// render as its own mirror.
const FILL: Record<Facelet, string> = {
  U: "#ffd500",
  D: "#ffffff",
  F: "#009b48",
  B: "#0046ad",
  R: "#ff5800",
  L: "#c8102e",
  masked: "#8a8f98",
};

const K = 30; // pixels per cubie
const PAD = 4;
const GAP = 0.1; // between U and its side strips, in cubies
const STRIP = 0.3;
const SIDES: readonly Color[] = ["R", "F", "L", "B"];

const gridPoint = ({ origin, column, row }: FaceGeometry, r: number, c: number): Vec => [
  origin[0] + c * column[0] + r * row[0],
  origin[1] + c * column[1] + r * row[1],
  origin[2] + c * column[2] + r * row[2],
];

// Sticker i of a face, corners in reading order.
function quad(face: Color, i: number): Vec[] {
  const g = FACE_GEOMETRY[face];
  const r = Math.floor(i / 3);
  const c = i % 3;
  return [gridPoint(g, r, c), gridPoint(g, r, c + 1), gridPoint(g, r + 1, c + 1), gridPoint(g, r + 1, c)];
}

// The FL camera is the FR camera reflected across x = 0. The state is read
// as-is; only where each sticker lands changes.
function isometric(faces: readonly Color[], mirror: boolean): Poly[] {
  const project = ([x, y, z]: Vec): Point => {
    const qx = mirror ? -x : x;
    return [
      ((mirror ? -K : K) * (qx - z)) / Math.SQRT2,
      (K * (qx - 2 * y + z)) / Math.sqrt(6),
    ];
  };
  return faces.flatMap((face) =>
    Array.from({ length: 9 }, (_, i) => ({
      index: SOLVED.indexOf(face) + i,
      corners: quad(face, i).map(project),
    })),
  );
}

// Screen is (x, z), so B is at the top and F at the bottom. Each side face's
// top row folds outward from the U edge along the face normal.
function top(): Poly[] {
  const u = Array.from({ length: 9 }, (_, i) => ({
    index: i,
    corners: quad("U", i).map(([x, , z]): Point => [K * x, K * z]),
  }));
  const strips = SIDES.flatMap((face) => {
    const g = FACE_GEOMETRY[face];
    const n = faceNormal(face);
    const out = (p: Vec, d: number): Point => [K * (p[0] + n[0] * d), K * (p[2] + n[2] * d)];
    return [0, 1, 2].map((c) => {
      const a = gridPoint(g, 0, c);
      const b = gridPoint(g, 0, c + 1);
      return {
        index: SOLVED.indexOf(face) + c,
        corners: [out(a, GAP), out(b, GAP), out(b, GAP + STRIP), out(a, GAP + STRIP)],
      };
    });
  });
  return [...u, ...strips];
}

function layout(polys: Poly[]) {
  const xs = polys.flatMap((p) => p.corners.map(([x]) => x));
  const ys = polys.flatMap((p) => p.corners.map(([, y]) => y));
  const left = Math.min(...xs) - PAD;
  const up = Math.min(...ys) - PAD;
  const box = [left, up, Math.max(...xs) + PAD - left, Math.max(...ys) + PAD - up];
  return {
    viewBox: box.map((n) => n.toFixed(2)).join(" "),
    cells: polys.map(({ index, corners }) => ({
      index,
      points: corners.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" "),
    })),
  };
}

const LAYOUT: Record<View, ReturnType<typeof layout>> = {
  "iso-fr": layout(isometric(["U", "R", "F"], false)),
  "iso-fl": layout(isometric(["U", "L", "F"], true)),
  top: layout(top()),
};

export function viewFor(mask: Mask): View {
  if (mask.kind !== "f2l") return "top";
  return mask.slot === "FR" ? "iso-fr" : "iso-fl";
}

export function renderCase(state: CaseState, view: View): string {
  const { viewBox, cells } = LAYOUT[view];
  const polygons = cells
    .map(({ index, points }) => `<polygon data-i="${index}" points="${points}" fill="${FILL[state[index]]}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="Cube case" stroke="#1a1a1a" stroke-width="1" stroke-linejoin="round">${polygons}</svg>`;
}
