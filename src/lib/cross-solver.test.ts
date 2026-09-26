import { describe, expect, it } from "vitest";
import { applyMoves, PIECES, SOLVED } from "./cube.ts";
import type { Cube } from "./cube.ts";
import { crossKey, SOLVED_KEY } from "./cross-state.ts";
import { distanceTable, optimalSolutions, POOL, regrips, SHOWN, solveCross } from "./cross-solver.ts";
import { refOptimal } from "./cross-reference.fixture.ts";
import { FACE_MOVES } from "./face-moves.ts";
import { scramble } from "./scramble.ts";
import { seededRandom } from "./seeded-random.fixture.ts";

const scrambled = (seed: number): Cube => applyMoves(SOLVED, scramble(seededRandom(seed)));

// Read straight off the facelets, not through the reduced model: the D center
// and the four D-layer edges all show their home colors.
const crossPieces = PIECES.filter(
  (piece) => piece.length <= 2 && piece.some((i) => SOLVED[i] === "D"),
);
const crossSolved = (cube: Cube) => crossPieces.every((piece) => piece.every((i) => cube[i] === SOLVED[i]));

describe("distance table", () => {
  const dist = distanceTable();
  const histogram = new Map<number, number>();
  for (const d of dist) if (d >= 0) histogram.set(d, (histogram.get(d) ?? 0) + 1);

  it("has a maximum of 8, the published depth of the cross", () => {
    expect(Math.max(...histogram.keys())).toBe(8);
  });

  // Counts per depth from reference/cross_solver.js's own BFS.
  it("matches the reference's count at every depth", () => {
    expect([...histogram.entries()].toSorted(([a], [b]) => a - b)).toEqual([
      [0, 1], [1, 15], [2, 158], [3, 1394], [4, 9809], [5, 46381], [6, 97254], [7, 34966], [8, 102],
    ]);
  });

  it("reaches all 190,080 states", () => {
    expect([...histogram.values()].reduce((a, b) => a + b, 0)).toBe(12 * 11 * 10 * 9 * 16);
  });
});

describe("solveCross", () => {
  it("returns no moves for a solved cross", () => {
    expect(solveCross(SOLVED)).toEqual([[]]);
  });

  it("returns no moves when only the last layer is scrambled", () => {
    const cube = applyMoves(SOLVED, [{ name: "U", turns: 1, prime: false }]);
    expect(solveCross(cube)).toEqual([[]]);
  });

  it("solves the cross with every solution it returns", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const cube = scrambled(seed);
      for (const solution of solveCross(cube)) {
        expect(crossSolved(applyMoves(cube, solution))).toBe(true);
      }
    }
  });

  it("returns only shortest solutions, distinct, at most SHOWN of them", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const cube = scrambled(seed);
      const solutions = solveCross(cube);
      const length = distanceTable()[crossKey(cube)];
      expect(solutions.length).toBeLessThanOrEqual(SHOWN);
      expect(new Set(solutions.map((s) => JSON.stringify(s))).size).toBe(solutions.length);
      for (const solution of solutions) expect(solution).toHaveLength(length);
    }
  });

  it("ranks by regrips, ties in the search's fixed order, and is deterministic", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const cube = scrambled(seed);
      const ranked = solveCross(cube);
      const asIndices = ranked.map((s) => s.map((m) => FACE_MOVES.indexOf(m)));
      const cost = asIndices.map(regrips);
      expect(cost).toEqual(cost.toSorted((a, b) => a - b));
      expect(solveCross(cube)).toEqual(ranked);
    }
  });

  it("finds as many optimal solutions as the reference, uncapped", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const moves = scramble(seededRandom(seed));
      const cube = applyMoves(SOLVED, moves);
      const expected = refOptimal(
        moves.map((m) => ({ face: m.name, quarters: m.turns === 2 ? 2 : m.prime ? 3 : 1 })),
      );
      const found = optimalSolutions(crossKey(cube), Infinity);
      expect(found.length).toBe(expected.count);
      expect(found[0]?.length ?? 0).toBe(expected.length);
    }
  });

  it("stops the search at the pool cap", () => {
    for (let seed = 1; seed <= 300; seed++) {
      expect(optimalSolutions(crossKey(scrambled(seed)), POOL).length).toBeLessThanOrEqual(POOL);
    }
  });

  it("has the solved key at distance 0", () => {
    expect(distanceTable()[SOLVED_KEY]).toBe(0);
  });
});
