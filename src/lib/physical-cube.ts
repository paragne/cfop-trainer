/**
 * Physical sticker tracking for the 3D animator. cube.ts's 54-array models
 * fixed positions with colors permuted between them; animation needs the
 * opposite — 54 physical stickers with a fixed color and a moving
 * position/orientation, so a sticker's on-screen transform can be updated
 * one move at a time instead of recomputed from scratch.
 */
import { MOVE_AXES, PIECES, quarterTurns, rotate, SOLVED, STICKERS } from "./cube.ts";
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
// for U and D, where [1,0,0] stands in instead. Exported for anything else
// that needs a flat plane's in-plane basis from just its normal — the 3D
// renderer's cut-plane caps, for one.
export function perpendicularBasis(normal: Vec): { column: Vec; row: Vec } {
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

// Exported so anything reconstructing a cubie's orientation from its faces
// (the WebGL renderer's model-matrix code) knows exactly which face array
// index is which axis, without a second hand-copied copy of this order.
export const ALL_AXES: readonly Vec[] = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const negate = (v: Vec): Vec => [-v[0], -v[1], -v[2]];
const sameVec = (a: Vec, b: Vec) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

// One of a cubie's 6 body-fixed faces, replacing the old shared-core model:
// a per-cubie body has no geometry to share with a neighbour or hide when a
// layer turns. A sticker face is a genuine facelet; every other face is
// invisible at rest and is only ever seen through a gap opened by a
// neighbouring cubie moving away. `colors` has two entries only for a middle
// edge's one un-stickered axis, split diagonally; every other face is one
// color — its own sticker's color if it has one, otherwise the sticker
// color on the opposite side of the same axis, otherwise (a center's other
// two axes) the center's own single color.
export type CubieFace = {
  readonly normal: Vec; // rotates with the cubie, like a sticker's normal
  readonly column: Vec;
  readonly row: Vec;
  readonly colors: readonly [Color] | readonly [Color, Color];
  readonly isSticker: boolean;
};

export type PhysicalCubie = {
  readonly position: Vec;
  readonly faces: readonly CubieFace[]; // always 6, one per axis direction
};

// Built once from home, per PIECES's grouping of STICKERS by cubie, so a
// cubie's identity (which physical piece it is) and its 6-face order are
// stable forever after — later moves rotate a cubie's own fields in place,
// the same way applyMovePhysical rotates a flat sticker, never re-derived
// from scratch (a hidden face has no sticker of its own to re-derive from).
export function homeCubies(): PhysicalCubie[] {
  const home = homeStickers();
  return PIECES.map((indices) => {
    const stickers = indices.map((i) => home[i]);
    const position = stickers[0].position;
    const colorOn = (normal: Vec) => stickers.find((s) => sameVec(s.normal, normal))?.color;
    const faces = ALL_AXES.map((normal): CubieFace => {
      const { column, row } = perpendicularBasis(normal);
      const own = colorOn(normal);
      if (own !== undefined) return { normal, column, row, colors: [own], isSticker: true };
      const opposite = colorOn(negate(normal));
      if (opposite !== undefined) return { normal, column, row, colors: [opposite], isSticker: false };
      const colors =
        stickers.length === 1
          ? ([stickers[0].color] as const)
          : ([stickers[0].color, stickers[1].color] as const);
      return { normal, column, row, colors, isSticker: false };
    });
    return { position, faces };
  });
}

export function applyMoveToCubies(cubies: readonly PhysicalCubie[], move: Move): PhysicalCubie[] {
  const { axis, depths } = MOVE_AXES[move.name];
  const quarters = quarterTurns(move);
  return cubies.map((cubie) => {
    if (!depths.includes(dot(axis, cubie.position))) return cubie;
    let { position, faces } = cubie;
    for (let q = 0; q < quarters; q++) {
      position = rotate(position, axis);
      faces = faces.map((f) => ({
        ...f,
        normal: rotate(f.normal, axis),
        column: rotate(f.column, axis),
        row: rotate(f.row, axis),
      }));
    }
    return { position, faces };
  });
}

export function applyAlgToCubies(cubies: readonly PhysicalCubie[], moves: readonly Move[]): PhysicalCubie[] {
  return moves.reduce(applyMoveToCubies, cubies as PhysicalCubie[]);
}

// Reconstructs colorsAt's flat array from cubies instead of flat stickers,
// so applyMoveToCubies can be checked against the already-proven
// applyMovePhysical without a second copy of the exhaustive per-case test.
export function colorsAtCubies(cubies: readonly PhysicalCubie[]): Cube {
  const stickers = cubies.flatMap((c) =>
    c.faces
      .filter((f) => f.isSticker)
      .map((f) => ({ position: c.position, normal: f.normal, column: f.column, row: f.row, color: f.colors[0] })),
  );
  return colorsAt(stickers);
}
