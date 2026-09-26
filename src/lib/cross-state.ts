/**
 * The cross reduced to the four D-layer edges. An edge is tracked by the
 * facelet its D-colored sticker sits on: which of the 24 edge facelets that is
 * fixes both its position and its orientation, since the other sticker is the
 * partner in the same PIECES group. Edges are identified by color, never by
 * where they sit.
 *
 * Transitions are read out of cube.ts's own move tables, so there is no second
 * copy of the face geometry to get a sign wrong. Face moves only: centers stay
 * home, so "solved" is every D sticker back on its home facelet.
 */
import { applyMoves, PIECES, SOLVED } from "./cube.ts";
import type { Cube } from "./cube.ts";
import { FACE_MOVES } from "./face-moves.ts";

const EDGES = PIECES.filter((piece) => piece.length === 2);
const EDGE_FACELETS = EDGES.flat();
const ORDINAL = new Map(EDGE_FACELETS.map((facelet, i) => [facelet, i]));
const BASE = EDGE_FACELETS.length;

const CROSS_EDGES = EDGES.flatMap((piece) => {
  const colors = piece.map((i) => SOLVED[i]);
  if (!colors.includes("D")) return [];
  const d = colors.indexOf("D");
  return [{ solved: piece[d], partner: colors[1 - d] }];
});

const ordinal = (facelet: number): number => {
  const found = ORDINAL.get(facelet);
  if (found === undefined) throw new Error(`Facelet ${facelet} is not on an edge`);
  return found;
};

// A packed key: one base-24 digit per cross edge, 331,776 slots of which
// 190,080 are reachable.
const pack = (digits: readonly number[]) => digits.reduce((key, digit) => key * BASE + digit, 0);

export const SOLVED_KEY = pack(CROSS_EDGES.map((edge) => ordinal(edge.solved)));

export function crossKey(cube: Cube): number {
  return pack(
    CROSS_EDGES.map(({ partner }) => {
      const piece = EDGES.find(
        (p) => p.some((i) => cube[i] === "D") && p.some((i) => cube[i] === partner),
      );
      const sticker = piece?.find((i) => cube[i] === "D");
      if (sticker === undefined) throw new Error(`No ${partner} cross edge on the cube`);
      return ordinal(sticker);
    }),
  );
}

// The facelet each cross edge's D sticker is on, in CROSS_EDGES order.
export function keyFacelets(key: number): number[] {
  return CROSS_EDGES.map((_, i) => {
    const digit = Math.floor(key / BASE ** (CROSS_EDGES.length - 1 - i)) % BASE;
    return EDGE_FACELETS[digit];
  });
}

const IDENTITY = Array.from({ length: 54 }, (_, i) => i);

// NEXT[m][d]: after move m, the digit a D sticker on edge facelet d lands on.
const NEXT = FACE_MOVES.map((move) => {
  const next: number[] = [];
  applyMoves(IDENTITY, [move]).forEach((source, dest) => {
    if (ORDINAL.has(source)) next[ordinal(source)] = ordinal(dest);
  });
  return next;
});

export function stepKey(key: number, move: number): number {
  const next = NEXT[move];
  const a = next[Math.floor(key / BASE ** 3) % BASE];
  const b = next[Math.floor(key / BASE ** 2) % BASE];
  const c = next[Math.floor(key / BASE) % BASE];
  return ((a * BASE + b) * BASE + c) * BASE + next[key % BASE];
}
