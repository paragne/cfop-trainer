/**
 * Physical sticker tracking for the 3D animator. cube.ts's 54-array models
 * fixed positions with colors permuted between them; animation needs the
 * opposite — 54 physical stickers with a fixed color and a moving
 * position/orientation, so a sticker's on-screen transform can be updated
 * one move at a time instead of recomputed from scratch.
 */
import { MOVE_AXES, quarterTurns, rotate, SOLVED, STICKERS } from "./cube.ts";
import type { Color, Cube, Vec } from "./cube.ts";
import type { Move } from "./notation.ts";

export type PhysicalSticker = {
  readonly position: Vec;
  readonly normal: Vec;
  readonly column: Vec; // an arbitrary-but-consistent in-plane basis; a square
  readonly row: Vec; // sticker looks the same under its own symmetry, so
  readonly color: Color; // which perpendicular pair we pick doesn't matter.
};

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

// Any unit vector not parallel to `normal` gives a perpendicular pair via
// two cross products; normals are always axis-aligned, so [0,1,0] only fails
// for U and D, where [1,0,0] stands in instead.
function perpendicularBasis(normal: Vec): { column: Vec; row: Vec } {
  const seed: Vec = Math.abs(normal[1]) === 1 ? [1, 0, 0] : [0, 1, 0];
  const column = cross(seed, normal);
  return { column, row: cross(normal, column) };
}

export function homeStickers(): PhysicalSticker[] {
  return STICKERS.map((sticker, i) => ({
    ...sticker,
    ...perpendicularBasis(sticker.normal),
    color: SOLVED[i],
  }));
}

export function applyMovePhysical(
  stickers: readonly PhysicalSticker[],
  move: Move,
): PhysicalSticker[] {
  const { axis, depths } = MOVE_AXES[move.name];
  const quarters = quarterTurns(move);
  return stickers.map((sticker) => {
    if (!depths.includes(dot(axis, sticker.position))) return sticker;
    let { position, normal, column, row } = sticker;
    for (let q = 0; q < quarters; q++) {
      position = rotate(position, axis);
      normal = rotate(normal, axis);
      column = rotate(column, axis);
      row = rotate(row, axis);
    }
    return { ...sticker, position, normal, column, row };
  });
}

export function applyAlgPhysical(
  stickers: readonly PhysicalSticker[],
  moves: readonly Move[],
): PhysicalSticker[] {
  return moves.reduce(applyMovePhysical, stickers as PhysicalSticker[]);
}

// `position` is the sticker's cubie center (needed as-is for layer-
// membership tests against depths -1/0/1) — a facelet's actual visible
// surface sits half a cubie further out along its own normal. Anything that
// renders or verifies where a sticker's face really is must use this, not
// `position` directly.
export function surfacePosition(sticker: PhysicalSticker): Vec {
  return [
    sticker.position[0] + 0.5 * sticker.normal[0],
    sticker.position[1] + 0.5 * sticker.normal[1],
    sticker.position[2] + 0.5 * sticker.normal[2],
  ];
}

// A cubie's position is shared by up to three stickers (one per sticker on
// that cubie); position plus normal is what identifies a single sticker,
// exactly as cube.ts's own INDEX map keys it.
const key = (position: Vec, normal: Vec) => `${position}|${normal}`;

// Reconstructs the engine's flat 54-slot color array by reading, at each
// home slot, whichever physical sticker currently occupies it.
export function colorsAt(stickers: readonly PhysicalSticker[]): Cube {
  const bySlot = new Map(stickers.map((s) => [key(s.position, s.normal), s.color]));
  return STICKERS.map((home) => {
    const color = bySlot.get(key(home.position, home.normal));
    if (color === undefined) throw new Error("No sticker at a home slot");
    return color;
  });
}
