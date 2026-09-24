import { describe, expect, it } from "vitest";
import { caseState, setupCube } from "../lib/case-state.ts";
import { PIECES, SOLVED } from "../lib/cube.ts";
import type { Color, Cube } from "../lib/cube.ts";
import { F2L_CASES } from "./algorithms.ts";

const ADVANCED = F2L_CASES.filter((c) => c.sets.includes("Advanced F2L"));
const idsOf = (sub: string) => ADVANCED.filter((c) => c.id.startsWith(`f2l-adv-${sub}-`));

const CROSS = [28, 30, 31, 32, 34, 25, 16, 43, 52];
const FR_SLOT = [29, 26, 15, 23, 12];

const nameOf = (piece: readonly number[]) => piece.map((i) => SOLVED[i]).toSorted().join("");
const holds = (cube: Cube, piece: readonly number[]) => piece.every((i) => cube[i] === SOLVED[i]);
const isDLayerCorner = (p: readonly number[]) => p.length === 3 && p.some((i) => SOLVED[i] === "D");
const isESliceEdge = (p: readonly number[]) =>
  p.length === 2 && p.every((i) => SOLVED[i] !== "U" && SOLVED[i] !== "D");
const hasLastLayerColor = (cube: Cube, p: readonly number[]) => p.some((i) => cube[i] === "U");

// The position a piece with exactly these colors currently occupies.
function positionOf(cube: Cube, colors: readonly Color[]): readonly number[] {
  const found = PIECES.find(
    (p) => p.length === colors.length && colors.every((c) => p.some((i) => cube[i] === c)),
  );
  if (found === undefined) throw new Error(`no piece with colors ${colors.join("")}`);
  return found;
}

// A slot position holding an F2L piece that belongs to another slot, as
// opposed to empty of one (a last-layer piece) or solved.
const wrongF2lPieces = (cube: Cube, isSlot: (p: readonly number[]) => boolean) =>
  PIECES.filter(isSlot).filter((p) => !holds(cube, p) && !hasLastLayerColor(cube, p));

// Where the target corner's white sticker faces, by face letter.
const whiteFace = (cube: Cube, piece: readonly number[]) => "URFDLB"[Math.floor(piece.find((i) => cube[i] === "D")! / 9)];

// J Perm's headings name a slot from the sheet's own point of view, and for
// "Right" and "Left" the pictures contradict the plain reading: the corner that
// sits in the front-right slot belongs to the front-left slot under "Right" and
// to the back-right slot under "Left". These predicates state the structure the
// pictures show, so the headings are only labels.
const FOREIGN_CORNER: Record<string, readonly Color[]> = {
  "corner-right": ["D", "F", "L"],
  "corner-left": ["B", "D", "R"],
  "corner-opposite": ["B", "D", "L"],
};

describe("Advanced F2L", () => {
  it("has J Perm's 36 cells, in his subsections", () => {
    expect([6, 12, 6, 6, 6]).toEqual(
      ["edge-up", "edge-side", "corner-right", "corner-left", "corner-opposite"].map((s) => idsOf(s).length),
    );
    expect(ADVANCED).toHaveLength(36);
  });

  it.each(ADVANCED)("$id: cross intact, target pair unsolved, target slot FR", (c) => {
    const cube = setupCube(c);
    expect(CROSS.filter((i) => cube[i] !== SOLVED[i])).toEqual([]);
    expect(FR_SLOT.some((i) => cube[i] !== SOLVED[i])).toBe(true);
    expect(c.mask).toEqual({ kind: "f2l", slot: "FR" });
  });

  describe("Section 2A: an edge is in the wrong slot", () => {
    const cases = [...idsOf("edge-up"), ...idsOf("edge-side")];
    it.each(cases)("$id: an F2L edge sits in another slot, no F2L corner does", (c) => {
      const cube = setupCube(c);
      expect(wrongF2lPieces(cube, isESliceEdge).length).toBeGreaterThan(0);
      expect(wrongF2lPieces(cube, isDLayerCorner)).toEqual([]);
    });

    // The corner over the FR slot, not the FR corner itself: in several cells
    // the FR corner is solved or in the back.
    it.each(idsOf("edge-up"))("$id: the corner over FR has its white sticker up", (c) => {
      const cube = setupCube(c);
      const over = PIECES.find((p) => nameOf(p) === "FRU");
      if (over === undefined) throw new Error("no FRU position");
      expect(whiteFace(cube, over)).toBe("U");
    });

    it.each(idsOf("edge-side"))("$id: the corner over FR has its white sticker on a side", (c) => {
      const cube = setupCube(c);
      const over = PIECES.find((p) => nameOf(p) === "FRU");
      if (over === undefined) throw new Error("no FRU position");
      expect(["R", "F"]).toContain(whiteFace(cube, over));
    });
  });

  describe("Section 2B: a corner is in the wrong slot", () => {
    it.each(["corner-right", "corner-left", "corner-opposite"].flatMap(idsOf))(
      "$id: the target corner is in the last layer and a foreign corner fills FR",
      (c) => {
        const cube = setupCube(c);
        const sub = c.id.replace(/^f2l-adv-/, "").replace(/-\d+$/, "");
        expect(nameOf(positionOf(cube, ["D", "F", "R"]))).toContain("U");
        const slotCorner = PIECES.find((p) => nameOf(p) === "DFR");
        if (slotCorner === undefined) throw new Error("no DFR position");
        expect(slotCorner.map((i) => cube[i]).toSorted()).toEqual(FOREIGN_CORNER[sub].toSorted());
        expect(wrongF2lPieces(cube, isESliceEdge)).toEqual([]);
      },
    );
  });
});

describe("F2L pictures", () => {
  // Faces U, F and R are all the FR camera sees.
  it("differ from one another in every case, Basic and Advanced together", () => {
    const seen = new Map<string, string>();
    for (const c of F2L_CASES) {
      const view = caseState(c).slice(0, 27).join(",");
      expect(seen.get(view), `${c.id} matches ${seen.get(view)}`).toBeUndefined();
      seen.set(view, c.id);
    }
  });
});
