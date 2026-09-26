import { applyMoves, SOLVED } from "./cube.ts";
import type { Cube } from "./cube.ts";
import { solveCross } from "./cross-solver.ts";
import type { Move } from "./notation.ts";
import { scramble } from "./scramble.ts";
import type { Action } from "./screen.ts";

// One scramble and its shortest cross solutions. Held in the screen and
// nowhere else: Cross grades, schedules and stores nothing.
export type CrossRound = {
  scramble: readonly Move[];
  cube: Cube;
  // Ranked best first. Never empty, and never a zero-move solution.
  solutions: readonly (readonly Move[])[];
  revealed: boolean;
  chosen: number;
};

export function startCross(random: () => number): CrossRound {
  const moves = scramble(random);
  const cube = applyMoves(SOLVED, moves);
  const solutions = solveCross(cube);
  // A solved cross has nothing to show, so draw again.
  if (solutions[0].length === 0) return startCross(random);
  return { scramble: moves, cube, solutions, revealed: false, chosen: 0 };
}

export const chooseSolution = (round: CrossRound, chosen: number): CrossRound => ({ ...round, chosen });

// Space reveals or hides, and Next (or the confirm key) draws a new scramble.
// Nothing else does anything here.
export function pressCross(round: CrossRound, action: Action, random: () => number): CrossRound {
  if (action === "reveal") return { ...round, revealed: !round.revealed };
  return action === "next" || action === "know" ? startCross(random) : round;
}
