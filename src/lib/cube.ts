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
 * from. Every move, including wide moves and rotations, is one layer turn
 * about a single axis (MOVE_AXES), not a composition of narrower ones.
 */
import type { Move, MoveName } from "./notation.ts";

export type Color = "U" | "R" | "F" | "D" | "L" | "B";
export type Cube = readonly Color[];

export type Vec = readonly [number, number, number];
export type FaceGeometry = { origin: Vec; column: Vec; row: Vec };
export type Sticker = { position: Vec; normal: Vec };
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

// Home position/normal of every facelet index. The 3D animator seeds its
// physical stickers from this; it is the same geometry every move table
// below is built from, not a second copy of it.
export const STICKERS: readonly Sticker[] = FACES.flatMap((face) =>
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

// Quarter turn clockwise as seen from the tip of `axis`. Exported so the 3D
// animator can advance a sticker's position/orientation the same way a move
// table's own construction does, one quarter at a time.
export function rotate(v: Vec, axis: Vec): Vec {
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

export type MoveAxes = { axis: Vec; depths: readonly number[] };

// The single description of which stickers turn about which axis, for every
// move name: a face turn is depth [1] on its own axis, a slice is [0], a
// wide move is both together, and a rotation is all three. Wide moves and
// rotations were previously built by composing the nine face/slice tables
// (e.g. `r` as R then M reversed); that produces the same permutation as
// turning both of r's layers about R's own axis directly, so this table is
// the one place that fact is written down, reused below to build
// QUARTER_TURN and by the 3D animator to know what to spin.
export const MOVE_AXES: Record<MoveName, MoveAxes> = {
  U: { axis: [0, 1, 0], depths: [1] },
  D: { axis: [0, -1, 0], depths: [1] },
  L: { axis: [-1, 0, 0], depths: [1] },
  R: { axis: [1, 0, 0], depths: [1] },
  F: { axis: [0, 0, 1], depths: [1] },
  B: { axis: [0, 0, -1], depths: [1] },
  // Each slice turns in the direction of its outer face: M with L, E with D, S with F.
  M: { axis: [-1, 0, 0], depths: [0] },
  E: { axis: [0, -1, 0], depths: [0] },
  S: { axis: [0, 0, 1], depths: [0] },
  u: { axis: [0, 1, 0], depths: [0, 1] },
  d: { axis: [0, -1, 0], depths: [0, 1] },
  l: { axis: [-1, 0, 0], depths: [0, 1] },
  r: { axis: [1, 0, 0], depths: [0, 1] },
  f: { axis: [0, 0, 1], depths: [0, 1] },
  b: { axis: [0, 0, -1], depths: [0, 1] },
  x: { axis: [1, 0, 0], depths: [-1, 0, 1] },
  y: { axis: [0, 1, 0], depths: [-1, 0, 1] },
  z: { axis: [0, 0, 1], depths: [-1, 0, 1] },
};

const tableFor = (name: MoveName): Table =>
  layerTurn(MOVE_AXES[name].axis, MOVE_AXES[name].depths);

const QUARTER_TURN: Record<MoveName, Table> = {
  U: tableFor("U"), D: tableFor("D"), L: tableFor("L"), R: tableFor("R"), F: tableFor("F"), B: tableFor("B"),
  M: tableFor("M"), E: tableFor("E"), S: tableFor("S"),
  u: tableFor("u"), d: tableFor("d"), l: tableFor("l"), r: tableFor("r"), f: tableFor("f"), b: tableFor("b"),
  x: tableFor("x"), y: tableFor("y"), z: tableFor("z"),
};

// `turns === 2` is a half turn either way; otherwise a prime is three quarter
// turns forward. Exported so the 3D animator advances its own tracked
// stickers by the same rule applyMoves uses for the engine's flat array.
export function quarterTurns({ turns, prime }: Move): number {
  return turns === 2 ? 2 : prime ? 3 : 1;
}

export function applyMoves<T>(cube: readonly T[], moves: readonly Move[]): T[] {
  let state = [...cube];
  for (const move of moves) {
    const table = QUARTER_TURN[move.name];
    for (let q = 0; q < quarterTurns(move); q++) state = table.map((from) => state[from]);
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
