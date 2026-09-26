import { describe, expect, it } from "vitest";
import { applyMoves, PIECES, SOLVED } from "./cube.ts";
import type { Color, Cube } from "./cube.ts";
import { crossKey, keyFacelets, SOLVED_KEY, stepKey } from "./cross-state.ts";
import { REF_SOLVED, refMove, SLOT_COLORS } from "./cross-reference.fixture.ts";
import type { RefEdge } from "./cross-reference.fixture.ts";
import { FACE_MOVES } from "./face-moves.ts";
import type { Move } from "./notation.ts";
import { scramble } from "./scramble.ts";
import { seededRandom } from "./seeded-random.fixture.ts";

const scrambled = (seed: number): Cube => applyMoves(SOLVED, scramble(seededRandom(seed)));

const quarter = (name: "F" | "R"): Move => ({ name, turns: 1, prime: false });

describe("cross state against cube.ts", () => {
  it("keys the solved cube as SOLVED_KEY", () => {
    expect(crossKey(SOLVED)).toBe(SOLVED_KEY);
  });

  // The reduced step is read from cube.ts's tables, so agreement here is by
  // construction; the reference test below is the independent one.
  it.each(FACE_MOVES.map((_, m) => m))("move %i: translate then step equals step then translate", (m) => {
    for (let seed = 1; seed <= 200; seed++) {
      const cube = scrambled(seed);
      expect(stepKey(crossKey(cube), m)).toBe(crossKey(applyMoves(cube, [FACE_MOVES[m]])));
    }
  });

  it("puts the D sticker of DF on the L face after F, and of DR on the F face after R", () => {
    const [, df] = keyFacelets(crossKey(applyMoves(SOLVED, [quarter("F")])));
    const [dr] = keyFacelets(crossKey(applyMoves(SOLVED, [quarter("R")])));
    expect(SOLVED[df]).toBe("L");
    expect(SOLVED[dr]).toBe("F");
  });
});

const pieceColors = (facelet: number): Color[] => {
  const piece = PIECES.find((p) => p.includes(facelet));
  if (piece === undefined) throw new Error("Facelet on no piece");
  return piece.map((i) => SOLVED[i]);
};

// (slot, orientation) in the reference's convention, from the facelet a cross
// edge's D sticker is on: the slot is the home piece there, and orientation 0
// means the sticker is on that slot's U/D face, or F/B face in the E slice.
function refEdge(facelet: number): RefEdge {
  const colors = new Set<string>(pieceColors(facelet));
  const slot = SLOT_COLORS.findIndex((name) => [...name].every((c) => colors.has(c)));
  const referenceFaces = slot < 8 ? ["U", "D"] : ["F", "B"];
  return [slot, referenceFaces.includes(SOLVED[facelet]) ? 0 : 1];
}

describe("cross state against reference/cross_solver.js", () => {
  // keyFacelets runs in cube.ts's piece order; the reference's is DR DF DL DB.
  const partners = keyFacelets(SOLVED_KEY).map((f) => pieceColors(f).find((c) => c !== "D"));
  const asReference = (cube: Cube) =>
    ["R", "F", "L", "B"].map((p) => refEdge(keyFacelets(crossKey(cube))[partners.findIndex((c) => c === p)]));

  it("starts from the same solved state", () => {
    expect(asReference(SOLVED)).toEqual(REF_SOLVED);
  });

  it("agrees after every scramble", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const moves = scramble(seededRandom(seed));
      const expected = moves.reduce(
        (edges, m) => refMove(edges, m.name, m.turns === 2 ? 2 : m.prime ? 3 : 1),
        REF_SOLVED,
      );
      expect(asReference(applyMoves(SOLVED, moves))).toEqual(expected);
    }
  });
});
