import type { Move } from "./notation.ts";

// The stable order the cross tie-break falls back on: R U F before L D B, so
// among otherwise equal solutions the ones on the easy faces come first. Each
// face is three consecutive entries (quarter, prime, half), and opposite faces
// sit three apart, which is what axisOf and the solver's canonical order rely on.
export const FACE_ORDER = ["R", "U", "F", "L", "D", "B"] as const;

export const FACE_MOVES: readonly Move[] = FACE_ORDER.flatMap((name) => [
  { name, turns: 1, prime: false },
  { name, turns: 1, prime: true },
  { name, turns: 2, prime: false },
]);

export const faceOf = (move: number) => Math.floor(move / 3);
export const axisOf = (move: number) => faceOf(move) % 3;
