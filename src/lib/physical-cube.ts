/**
 * Physical sticker tracking for the 3D animator: 54 stickers with a fixed
 * color and a moving position/orientation (cube.ts's 54-array is the
 * opposite — fixed positions, permuted colors), so a transform updates one
 * move at a time instead of being recomputed from scratch.
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

// Any unit vector not parallel to `normal` gives a perpendicular pair via two
// cross products; normals are axis-aligned, so [0,1,0] only fails for U/D,
// where [1,0,0] stands in. Exported for anything else needing a flat plane's
// in-plane basis from just its normal — the 3D renderer's cut-plane caps.
export function perpendicularBasis(normal: Vec): { column: Vec; row: Vec } {
  const seed: Vec = Math.abs(normal[1]) === 1 ? [1, 0, 0] : [0, 1, 0];
  const column = cross(seed, normal);
  return { column, row: cross(normal, column) };
}

function stickersFromColors(cube: Cube): PhysicalSticker[] {
  return STICKERS.map((sticker, i) => ({
    ...sticker,
    ...perpendicularBasis(sticker.normal),
    color: cube[i],
  }));
}

export function homeStickers(): PhysicalSticker[] {
  return stickersFromColors(SOLVED);
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

// `position` is the cubie center (for layer tests against depths -1/0/1); a
// facelet's visible surface sits half a cubie out along its normal — use this
// wherever a sticker's face location matters, not `position`.
export function surfacePosition(sticker: PhysicalSticker): Vec {
  return [
    sticker.position[0] + 0.5 * sticker.normal[0],
    sticker.position[1] + 0.5 * sticker.normal[1],
    sticker.position[2] + 0.5 * sticker.normal[2],
  ];
}

// Position plus normal identifies a single sticker, as in cube.ts's INDEX.
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

// One of a cubie's 6 body-fixed faces: a per-cubie body has no geometry to
// share with a neighbour or hide when a layer turns, so a non-sticker face
// still needs a color, for the gap a moving neighbour can open onto it.
// `colors` has two entries only for a middle edge's un-stickered axis, split
// diagonally; every other face is one color — its own sticker's if it has
// one, else the opposite sticker's, else (a center's other axes) its own.
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

// Built once from a set of home-positioned stickers, per PIECES's grouping
// of STICKERS by cubie, so a cubie's identity is stable forever after —
// later moves rotate a cubie's own fields in place, never re-derived from
// scratch (a hidden face has no sticker of its own to re-derive from).
function cubiesFromStickers(home: readonly PhysicalSticker[]): PhysicalCubie[] {
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

export function homeCubies(): PhysicalCubie[] {
  return cubiesFromStickers(homeStickers());
}

// Places every cubie at its home position/orientation, colored from an
// arbitrary (already normalized) flat Cube instead of SOLVED — the physical
// twin of case-state.ts's setupCube() for cases whose setup includes a
// partial-depth move (f2l-slot-3/4/5). normalize() there relabels every
// sticker in place, which has no rotation equivalent once corners and edges
// are independently scrambled too (confirmed by direct computation:
// homeRotation's best single-rotation candidate still disagreed with
// normalize() at 25 of 54 facelets for f2l-slot-3's setup) — building the
// physical model straight from case-state.ts's own array sidesteps that.
export function cubiesFromColors(cube: Cube): PhysicalCubie[] {
  return cubiesFromStickers(stickersFromColors(cube));
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

// colorsAt's flat array, from cubies — lets applyMoveToCubies be checked
// against the already-proven applyMovePhysical.
export function colorsAtCubies(cubies: readonly PhysicalCubie[]): Cube {
  const stickers = cubies.flatMap((c) =>
    c.faces
      .filter((f) => f.isSticker)
      .map((f) => ({ position: c.position, normal: f.normal, column: f.column, row: f.row, color: f.colors[0] })),
  );
  return colorsAt(stickers);
}
