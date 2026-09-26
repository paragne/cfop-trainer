/**
 * Optimal cross solutions. The distance table is a BFS over every reachable
 * cross state, built on first use; a search then only walks moves that get one
 * step closer, so it visits optimal solutions and nothing else.
 */
import type { Cube } from "./cube.ts";
import { crossKey, SOLVED_KEY, stepKey } from "./cross-state.ts";
import { axisOf, FACE_MOVES, faceOf } from "./face-moves.ts";
import type { Move } from "./notation.ts";

export const SHOWN = 5;
// Some scrambles have thousands of optimal solutions at depth 8, so the search
// stops at a pool rather than enumerating them all.
export const POOL = 200;

const SLOTS = 24 ** 4;
let table: Int8Array | null = null;

export function distanceTable(): Int8Array {
  if (table !== null) return table;
  const dist = new Int8Array(SLOTS).fill(-1);
  const queue = new Int32Array(SLOTS);
  dist[SOLVED_KEY] = 0;
  queue[0] = SOLVED_KEY;
  for (let head = 0, tail = 1; head < tail; head++) {
    const key = queue[head];
    for (let m = 0; m < FACE_MOVES.length; m++) {
      const next = stepKey(key, m);
      if (dist[next] >= 0) continue;
      dist[next] = dist[key] + 1;
      queue[tail++] = next;
    }
  }
  table = dist;
  return dist;
}

// Opposite faces commute, so of "R L" and "L R" only the one whose first face
// comes earlier in FACE_ORDER is generated.
function allowed(move: number, previous: number): boolean {
  if (previous < 0 || axisOf(move) !== axisOf(previous)) return true;
  return faceOf(move) > faceOf(previous);
}

// Move indices, in the fixed lexicographic order, stopping at `cap`.
export function optimalSolutions(key: number, cap: number): number[][] {
  const dist = distanceTable();
  const found: number[][] = [];
  const path: number[] = [];
  const walk = (at: number, remaining: number) => {
    if (remaining === 0) {
      found.push([...path]);
      return;
    }
    for (let m = 0; m < FACE_MOVES.length && found.length < cap; m++) {
      if (!allowed(m, path.length > 0 ? path[path.length - 1] : -1)) continue;
      const next = stepKey(at, m);
      if (dist[next] !== remaining - 1) continue;
      path.push(m);
      walk(next, remaining - 1);
      path.pop();
    }
  };
  walk(key, dist[key]);
  return found;
}

// Consecutive moves on opposite faces: the only non-adjacent pairs, since the
// search never repeats a face.
export const regrips = (solution: readonly number[]): number =>
  solution.filter((m, i) => i > 0 && axisOf(m) === axisOf(solution[i - 1])).length;

// Shortest first (all candidates are optimal), then fewest regrips, then the
// search's own order. Array.sort is stable.
export function solveCross(cube: Cube): Move[][] {
  return optimalSolutions(crossKey(cube), POOL)
    .toSorted((a, b) => regrips(a) - regrips(b))
    .slice(0, SHOWN)
    .map((solution) => solution.map((m) => FACE_MOVES[m]));
}
