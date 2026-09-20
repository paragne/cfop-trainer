/**
 * 54-facelet cube: U(0-8) R(9-17) F(18-26) D(27-35) L(36-44) B(45-53),
 * row-major within a face. Centers are at 4, 13, 22, 31, 40, 49.
 *
 * Frame: x toward R, y toward U, z toward F, in cubie units, so the cube spans
 * [-1.5, 1.5] on every axis. FACE_GEOMETRY is the one definition of where a
 * face's stickers sit: read the face from `origin`, with each column stepping
 * along `column` and each row along `row`. U is viewed from above with its B
 * edge at the top, D from below with its F edge at the top, and the other four
 * head-on with U at the top.
 *
 * A move table lists, for each destination index, the index its sticker comes
 * from. Nine layer turns are generated from this geometry; wide moves and
 * rotations are compositions of those.
 */
import type { Move, MoveName } from "./notation.ts";

export type Color = "U" | "R" | "F" | "D" | "L" | "B";
export type Cube = readonly Color[];

export type Vec = readonly [number, number, number];
export type FaceGeometry = { origin: Vec; column: Vec; row: Vec };
type Sticker = { position: Vec; normal: Vec };
type Table = readonly number[];

const FACES: readonly Color[] = ["U", "R", "F", "D", "L", "B"];
const CENTERS = [4, 13, 22, 31, 40, 49];

export const SOLVED: Cube = FACES.flatMap((face) => Array<Color>(9).fill(face));

// Every renderer reads this table. A second copy of these constants is a
// second place for a hand-derived sign error.
export const FACE_GEOMETRY: Record<Color, FaceGeometry> = {
  U: { origin: [-1.5, 1.5, -1.5], column: [1, 0, 0], row: [0, 0, 1] },
  R: { origin: [1.5, 1.5, 1.5], column: [0, 0, -1], row: [0, -1, 0] },
  F: { origin: [-1.5, 1.5, 1.5], column: [1, 0, 0], row: [0, -1, 0] },
  D: { origin: [-1.5, -1.5, 1.5], column: [1, 0, 0], row: [0, 0, -1] },
  L: { origin: [-1.5, 1.5, -1.5], column: [0, 0, 1], row: [0, -1, 0] },
  B: { origin: [1.5, 1.5, -1.5], column: [-1, 0, 0], row: [0, -1, 0] },
};

const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

// Outward from the cube. `row` points down the face and `column` across it, so
// row x column comes out toward the viewer.
export function faceNormal(face: Color): Vec {
  const { column, row } = FACE_GEOMETRY[face];
  return cross(row, column);
}

// A cubie's position is where its center sits, half a unit inside the face.
function stickerAt(face: Color, r: number, c: number): Sticker {
  const { origin, column, row } = FACE_GEOMETRY[face];
  const normal = faceNormal(face);
  const at = (k: 0 | 1 | 2) =>
    origin[k] + (c + 0.5) * column[k] + (r + 0.5) * row[k] - 0.5 * normal[k];
  return { position: [at(0), at(1), at(2)], normal };
}

const STICKERS = FACES.flatMap((face) =>
  Array.from({ length: 9 }, (_, i) => stickerAt(face, Math.floor(i / 3), i % 3)),
);

const key = (position: Vec, normal: Vec) => `${position}|${normal}`;
const INDEX = new Map(STICKERS.map((s, i) => [key(s.position, s.normal), i]));

const cubies = new Map<string, number[]>();
STICKERS.forEach((s, i) => {
  const id = String(s.position);
  cubies.set(id, [...(cubies.get(id) ?? []), i]);
});

// Sticker indices grouped by the cubie they sit on. Group size is the piece
// kind: 1 center, 2 edge, 3 corner.
export const PIECES: readonly (readonly number[])[] = [...cubies.values()];

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// Quarter turn clockwise as seen from the tip of `axis`.
function rotate(v: Vec, axis: Vec): Vec {
  const d = dot(axis, v);
  return [
    axis[0] * d - (axis[1] * v[2] - axis[2] * v[1]),
    axis[1] * d - (axis[2] * v[0] - axis[0] * v[2]),
    axis[2] * d - (axis[0] * v[1] - axis[1] * v[0]),
  ];
}

// `depths` selects layers by their distance along `axis`: 1 outer, 0 middle.
function layerTurn(axis: Vec, depths: readonly number[]): Table {
  const table = STICKERS.map((_, i) => i);
  STICKERS.forEach((s, from) => {
    if (!depths.includes(dot(axis, s.position))) return;
    const to = INDEX.get(
      key(rotate(s.position, axis), rotate(s.normal, axis)),
    );
    if (to === undefined) throw new Error("Rotated sticker left the cube");
    table[to] = from;
  });
  return table;
}

// Applies each table in turn, left to right.
function compose(first: Table, ...rest: Table[]): Table {
  return rest.reduce((a, b) => a.map((_, j) => a[b[j]]), first);
}

function inverse(table: Table): Table {
  const result: number[] = [];
  table.forEach((from, to) => {
    result[from] = to;
  });
  return result;
}

const U = layerTurn([0, 1, 0], [1]);
const D = layerTurn([0, -1, 0], [1]);
const R = layerTurn([1, 0, 0], [1]);
const L = layerTurn([-1, 0, 0], [1]);
const F = layerTurn([0, 0, 1], [1]);
const B = layerTurn([0, 0, -1], [1]);
// Each slice turns in the direction of its outer face: M with L, E with D, S with F.
const M = layerTurn([-1, 0, 0], [0]);
const E = layerTurn([0, -1, 0], [0]);
const S = layerTurn([0, 0, 1], [0]);

const QUARTER_TURN: Record<MoveName, Table> = {
  U, D, L, R, F, B, M, E, S,
  u: compose(U, inverse(E)),
  d: compose(D, E),
  l: compose(L, M),
  r: compose(R, inverse(M)),
  f: compose(F, S),
  b: compose(B, inverse(S)),
  x: compose(R, inverse(M), inverse(L)),
  y: compose(U, inverse(E), inverse(D)),
  z: compose(F, S, inverse(B)),
};

export function applyMoves<T>(cube: readonly T[], moves: readonly Move[]): T[] {
  let state = [...cube];
  for (const { name, turns, prime } of moves) {
    const table = QUARTER_TURN[name];
    const quarters = turns === 2 ? 2 : prime ? 3 : 1;
    for (let q = 0; q < quarters; q++) state = table.map((from) => state[from]);
  }
  return state;
}

// Slices and rotations move the centers, so a state can be a solved cube
// held in another orientation. Relabeling by where each color's center sits
// puts it back in the standard scheme without moving any sticker.
export function normalize(cube: Cube): Cube {
  return cube.map(
    (color) => FACES[CENTERS.findIndex((i) => cube[i] === color)],
  );
}
