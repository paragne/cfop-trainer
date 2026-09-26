/**
 * The cross model from reference/cross_solver.js, written by a session that
 * never saw this codebase. It is an oracle only: a second, independent
 * derivation of how face turns move the four cross edges, to be compared with
 * cube.ts, never trusted or reused by app code.
 *
 * Edge slots: 0 UR,1 UF,2 UL,3 UB,4 DR,5 DF,6 DL,7 DB,8 FR,9 FL,10 BL,11 BR.
 * A slot's orientation reference is its U/D sticker, or its F/B sticker for
 * the E-slice slots 8-11. An F or B quarter turn flips an edge.
 */
export type RefEdge = readonly [slot: number, orientation: number];

export const SLOT_COLORS = [
  "UR", "UF", "UL", "UB", "DR", "DF", "DL", "DB", "FR", "FL", "BL", "BR",
];

const FACES: Record<string, readonly [readonly number[], number]> = {
  U: [[0, 1, 2, 3], 0], D: [[5, 4, 7, 6], 0],
  R: [[0, 11, 4, 8], 0], L: [[2, 9, 6, 10], 0],
  F: [[1, 8, 5, 9], 1], B: [[3, 10, 7, 11], 1],
};

// `quarters` is 1, 2 or 3 (a prime is three).
export function refMove(edges: readonly RefEdge[], face: string, quarters: number): RefEdge[] {
  const [cycle, flips] = FACES[face];
  return edges.map(([slot, orientation]) => {
    let [p, o] = [slot, orientation];
    if (!cycle.includes(p)) return [p, o];
    for (let k = 0; k < quarters; k++) {
      p = cycle[(cycle.indexOf(p) + 1) % 4];
      if (flips) o ^= 1;
    }
    return [p, o];
  });
}

// The DR, DF, DL, DB edges, solved.
export const REF_SOLVED: readonly RefEdge[] = [[4, 0], [5, 0], [6, 0], [7, 0]];

const REF_MOVES = Object.keys(FACES).flatMap((face) =>
  [1, 2, 3].map((quarters) => ({ face, quarters })),
);

const key = (edges: readonly RefEdge[]) =>
  edges.reduce((sum, [p, o]) => sum * 24 + p * 2 + o, 0);

let refDist: Map<number, number> | null = null;

function distances(): Map<number, number> {
  if (refDist !== null) return refDist;
  const dist = new Map<number, number>([[key(REF_SOLVED), 0]]);
  let frontier = [REF_SOLVED];
  for (let d = 0; frontier.length > 0; d++) {
    const next: (readonly RefEdge[])[] = [];
    for (const state of frontier) {
      for (const m of REF_MOVES) {
        const to = refMove(state, m.face, m.quarters);
        if (!dist.has(key(to))) {
          dist.set(key(to), d + 1);
          next.push(to);
        }
      }
    }
    frontier = next;
  }
  refDist = dist;
  return dist;
}

// Optimal solution count for a scramble, the reference's own enumeration: BFS
// distances, then every walk that steps one closer, with "R L" allowed and
// "L R" not.
export function refOptimal(scramble: readonly { face: string; quarters: number }[]): {
  length: number;
  count: number;
} {
  const dist = distances();
  const opposite: Record<string, string> = { U: "D", D: "U", R: "L", L: "R", F: "B", B: "F" };
  const start = scramble.reduce((s, m) => refMove(s, m.face, m.quarters), REF_SOLVED);
  const count = (state: readonly RefEdge[], previous: string | null): number => {
    const d = dist.get(key(state)) ?? -1;
    if (d === 0) return 1;
    let total = 0;
    for (const m of REF_MOVES) {
      if (m.face === previous) continue;
      if (opposite[m.face] === previous && "UFR".includes(m.face)) continue;
      const to = refMove(state, m.face, m.quarters);
      if (dist.get(key(to)) === d - 1) total += count(to, m.face);
    }
    return total;
  };
  return { length: dist.get(key(start)) ?? -1, count: count(start, null) };
}
