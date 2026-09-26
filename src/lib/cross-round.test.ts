import { describe, expect, it } from "vitest";
import { applyMoves, PIECES, SOLVED } from "./cube.ts";
import type { Cube } from "./cube.ts";
import { chooseSolution, pressCross, startCross } from "./cross-round.ts";
import { scramble } from "./scramble.ts";
import { seededRandom } from "./seeded-random.fixture.ts";

// Read off the facelets, not through the solver's own model.
const crossSolved = (cube: Cube) =>
  PIECES.filter((p) => p.length <= 2 && p.some((i) => SOLVED[i] === "D")).every((p) =>
    p.every((i) => cube[i] === SOLVED[i]),
  );

describe("startCross", () => {
  it("draws an unsolved cross, hidden, on the best solution", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const round = startCross(seededRandom(seed));
      expect(crossSolved(round.cube)).toBe(false);
      expect(round.revealed).toBe(false);
      expect(round.chosen).toBe(0);
      expect(round.solutions.length).toBeGreaterThan(0);
      expect(round.solutions.length).toBeLessThanOrEqual(5);
    }
  });

  it("builds the cube from the scramble it shows, and every solution solves it", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const round = startCross(seededRandom(seed));
      expect(applyMoves(SOLVED, round.scramble)).toEqual(round.cube);
      for (const solution of round.solutions) expect(crossSolved(applyMoves(round.cube, solution))).toBe(true);
    }
  });

  // Found by search: this seed's first scramble happens to leave the cross solved.
  const SOLVED_CROSS_SEED = 12197;

  it("draws again when the scramble leaves the cross solved", () => {
    const first = applyMoves(SOLVED, scramble(seededRandom(SOLVED_CROSS_SEED)));
    expect(crossSolved(first)).toBe(true);
    const round = startCross(seededRandom(SOLVED_CROSS_SEED));
    expect(crossSolved(round.cube)).toBe(false);
    expect(round.solutions[0]).not.toHaveLength(0);
  });
});

describe("pressCross", () => {
  const round = startCross(seededRandom(3));
  const random = seededRandom(9);

  it("toggles the reveal on reveal, and keeps the scramble", () => {
    const shown = pressCross(round, "reveal", random);
    expect(shown.revealed).toBe(true);
    expect(shown.scramble).toBe(round.scramble);
    expect(pressCross(shown, "reveal", random).revealed).toBe(false);
  });

  it("draws a new scramble on next and on the confirm key", () => {
    for (const action of ["next", "know"] as const) {
      const next = pressCross(pressCross(round, "reveal", random), action, random);
      expect(next.scramble).not.toBe(round.scramble);
      expect(next.revealed).toBe(false);
    }
  });

  it("ignores grading and the names toggle", () => {
    for (const action of ["dontKnow", "toggleNames"] as const) expect(pressCross(round, action, random)).toBe(round);
  });

  it("chooses a solution without touching the rest", () => {
    const chosen = chooseSolution(round, 1);
    expect(chosen.chosen).toBe(1);
    expect(chosen.scramble).toBe(round.scramble);
  });
});
