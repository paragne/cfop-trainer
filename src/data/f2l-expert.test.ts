import { describe, expect, it } from "vitest";
import { caseState, setupCube } from "../lib/case-state.ts";
import { PIECES, SOLVED } from "../lib/cube.ts";
import type { Color, Cube } from "../lib/cube.ts";
import { parse } from "../lib/notation.ts";
import { F2L_CASES } from "./algorithms.ts";

const EXPERT = F2L_CASES.filter((c) => c.sets.includes("Expert F2L"));
const idsOf = (sub: string) => EXPERT.filter((c) => c.id.startsWith(`f2l-exp-${sub}-`));

const CROSS = [28, 30, 31, 32, 34, 25, 16, 43, 52];
const FR_SLOT = [29, 26, 15, 23, 12];
const CENTERS = [4, 13, 22, 31, 40, 49];

const nameOf = (piece: readonly number[]) => piece.map((i) => SOLVED[i]).toSorted().join("");
const holds = (cube: Cube, piece: readonly number[]) => piece.every((i) => cube[i] === SOLVED[i]);

// The position a piece with exactly these colors currently occupies.
function positionOf(cube: Cube, colors: readonly Color[]): readonly number[] {
  const found = PIECES.find(
    (p) => p.length === colors.length && colors.every((c) => p.some((i) => cube[i] === c)),
  );
  if (found === undefined) throw new Error(`no piece with colors ${colors.join("")}`);
  return found;
}
const slotPosition = (name: string): readonly number[] => {
  const found = PIECES.find((p) => nameOf(p) === name);
  if (found === undefined) throw new Error(`no ${name} position`);
  return found;
};

// The predicates state the structure the pictures show. J Perm's headings are
// only labels; "Other Easy Cases" says nothing structural.
const targetCorner = (cube: Cube) => positionOf(cube, ["D", "F", "R"]);
const targetEdge = (cube: Cube) => positionOf(cube, ["F", "R"]);
const SLOT_PAIRS = [["DFL", "FL"], ["BDR", "BR"], ["BDL", "BL"]];

describe("Expert F2L", () => {
  it("has J Perm's 17 cells, in his subsections", () => {
    expect(["corner-solved", "pair-wrong", "flipped", "other"].map((s) => idsOf(s).length)).toEqual([6, 3, 6, 2]);
    expect(EXPERT).toHaveLength(17);
  });

  it.each(EXPERT)("$id: cross intact, target pair unsolved, target slot FR", (c) => {
    const cube = setupCube(c);
    expect(CROSS.filter((i) => cube[i] !== SOLVED[i])).toEqual([]);
    expect(FR_SLOT.some((i) => cube[i] !== SOLVED[i])).toBe(true);
    expect(c.mask).toEqual({ kind: "f2l", slot: "FR" });
  });

  it.each(idsOf("corner-solved"))("$id: the corner is solved, the edge sits in another slot", (c) => {
    const cube = setupCube(c);
    expect(holds(cube, slotPosition("DFR"))).toBe(true);
    const edge = nameOf(targetEdge(cube));
    expect(["FL", "BR", "BL"]).toContain(edge);
  });

  it.each(idsOf("pair-wrong"))("$id: the corner and the edge share another slot", (c) => {
    const cube = setupCube(c);
    const pair = [nameOf(targetCorner(cube)), nameOf(targetEdge(cube))];
    expect(SLOT_PAIRS).toContainEqual(pair);
  });

  it.each(idsOf("flipped"))("$id: the edge is flipped in FR and the corner sits in an adjacent slot", (c) => {
    const cube = setupCube(c);
    expect(nameOf(targetEdge(cube))).toBe("FR");
    expect(holds(cube, targetEdge(cube))).toBe(false);
    expect(["DFL", "BDR"]).toContain(nameOf(targetCorner(cube)));
  });

  it.each(idsOf("other"))("$id: the corner is twisted in place and the edge sits in an adjacent slot", (c) => {
    const cube = setupCube(c);
    expect(nameOf(targetCorner(cube))).toBe("DFR");
    expect(holds(cube, targetCorner(cube))).toBe(false);
    expect(["FL", "BR"]).toContain(nameOf(targetEdge(cube)));
  });

  // A setup that starts and ends with y turns the cube back, so the 3D model
  // starts from the same cube the 2D picture shows.
  describe.each(EXPERT.filter((c) => c.setup !== null))("$id setup override", (c) => {
    it("draws the same picture as the inverse of algs[0]", () => {
      expect(caseState(c)).toEqual(caseState({ ...c, setup: null }));
    });

    it("leaves the cube physically home", () => {
      const cube = setupCube(c);
      expect(CENTERS.filter((i) => cube[i] !== SOLVED[i])).toEqual([]);
      expect(c.setup === null ? [] : parse(c.setup).map((m) => m.name)).toContain("y");
    });
  });
});
