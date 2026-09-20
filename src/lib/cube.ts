/**
 * 54-facelet cube: U(0-8) R(9-17) F(18-26) D(27-35) L(36-44) B(45-53),
 * row-major within a face. Centers are at 4, 13, 22, 31, 40, 49.
 *
 * Frame: x toward R, y toward U, z toward F. A face's (row r, column c)
 * sits at:
 *   U  (c-1,  1, r-1)  viewed from above, B edge at the top
 *   R  ( 1, 1-r, 1-c)  viewed head-on, U at the top
 *   F  (c-1, 1-r,  1)
 *   D  (c-1, -1, 1-r)  viewed from below, F edge at the top
 *   L  (-1, 1-r, c-1)
 *   B  (1-c, 1-r, -1)
 *
 * A move table lists, for each destination index, the index its sticker comes
 * from. Nine layer turns are generated from this geometry; wide moves and
 * rotations are compositions of those.
 */
import type { Move, MoveName } from "./notation.ts";

export type Color = "U" | "R" | "F" | "D" | "L" | "B";
export type Cube = readonly Color[];

type Vec = readonly [number, number, number];
type Sticker = { position: Vec; normal: Vec };
type Table = readonly number[];

const FACES: readonly Color[] = ["U", "R", "F", "D", "L", "B"];
const CENTERS = [4, 13, 22, 31, 40, 49];

export const SOLVED: Cube = FACES.flatMap((face) => Array<Color>(9).fill(face));

function stickerAt(face: Color, r: number, c: number): Sticker {
  switch (face) {
    case "U":
      return { position: [c - 1, 1, r - 1], normal: [0, 1, 0] };
    case "R":
      return { position: [1, 1 - r, 1 - c], normal: [1, 0, 0] };
    case "F":
      return { position: [c - 1, 1 - r, 1], normal: [0, 0, 1] };
    case "D":
      return { position: [c - 1, -1, 1 - r], normal: [0, -1, 0] };
    case "L":
      return { position: [-1, 1 - r, c - 1], normal: [-1, 0, 0] };
    case "B":
      return { position: [1 - c, 1 - r, -1], normal: [0, 0, -1] };
  }
}

const STICKERS = FACES.flatMap((face) =>
  Array.from({ length: 9 }, (_, i) => stickerAt(face, Math.floor(i / 3), i % 3)),
);

const key = (position: Vec, normal: Vec) => `${position}|${normal}`;
const INDEX = new Map(STICKERS.map((s, i) => [key(s.position, s.normal), i]));

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
