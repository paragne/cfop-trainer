import { describe, expect, it } from "vitest";
import type { Case, Mask } from "../data/algorithms.ts";
import { caseState } from "./case-state.ts";
import type { CaseState, Facelet } from "./case-state.ts";
import { applyMoves, normalize, SOLVED } from "./cube.ts";
import { parse } from "./notation.ts";

// `setup` is applied as-is, and "" parses to no moves, so a synthetic case
// yields a solved cube or any other state a test needs.
const caseWith = (mask: Mask, setup: string | null, alg = "U"): Case => ({
  id: "synthetic",
  group: "F2L",
  section: "",
  name: null,
  aliases: [],
  algs: [{ display: alg, moves: alg }],
  mask,
  setup,
  videoUrl: null,
});

const colored = (state: CaseState) =>
  state.flatMap((facelet, i) => (facelet === "masked" ? [] : [i]));

const range = (from: number, to: number) =>
  Array.from({ length: to - from }, (_, i) => from + i);

const FR: Mask = { kind: "f2l", slot: "FR" };
const FL: Mask = { kind: "f2l", slot: "FL" };
const FR_HOME = [12, 15, 23, 26, 29];
const LAST_LAYER = [...range(0, 9), ...[9, 18, 36, 45].flatMap((s) => range(s, s + 3))];

// Index sets read off the face layout in cube.ts, independent of PIECES.
describe("masks on a solved cube", () => {
  it.each<[string, Mask, number[]]>([
    ["FR", FR, FR_HOME],
    ["FL", FL, [21, 24, 27, 41, 44]],
    ["oll-full", { kind: "oll-full" }, range(0, 9)],
    ["oll-edges", { kind: "oll-edges" }, [1, 3, 4, 5, 7]],
    ["pll-corners", { kind: "pll-corners" }, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 18, 20, 36, 38, 45, 47]],
    ["pll-full", { kind: "pll-full" }, LAST_LAYER.toSorted((a, b) => a - b)],
  ])("%s", (_, mask, expected) => {
    expect(colored(caseState(caseWith(mask, "")))).toEqual(expected);
  });
});

describe("caseState", () => {
  it("never changes the color of a sticker it keeps", () => {
    const setup = "R U R' U' R' F R2 U' R' U' R U R' F'";
    const cube = normalize(applyMoves(SOLVED, parse(setup)));
    const masks: Mask[] = [
      { kind: "oll-edges" },
      { kind: "oll-full" },
      { kind: "pll-corners" },
      { kind: "pll-full" },
    ];
    for (const mask of masks) {
      const state = caseState(caseWith(mask, setup));
      state.forEach((facelet, i) => {
        if (facelet !== "masked") expect(facelet).toBe(cube[i]);
      });
    }
  });

  it("derives a null setup from the inverse of algs[0]", () => {
    expect(caseState(caseWith(FR, null, "R U R'"))).toEqual(
      caseState(caseWith(FR, "R U' R'")),
    );
  });

  it("colors the pair where it went, not the slot it left", () => {
    const setup = "R U' R'";
    const marks = SOLVED.map((_, i) => FR_HOME.includes(i));
    const moved = applyMoves(marks, parse(setup)).flatMap((m, i) => (m ? [i] : []));
    const state = caseState(caseWith(FR, setup));

    expect(colored(state)).toEqual(moved);
    expect(colored(state)).not.toEqual(FR_HOME);
    expect(colored(state).map((i) => state[i]).toSorted()).toEqual(["D", "F", "F", "R", "R"]);
  });

  // The pair is read from colors after normalize. Following the home slot
  // through the moves picks the wrong stickers once a rotation is involved.
  it("ignores a rotation held before the setup", () => {
    expect(caseState(caseWith(FR, "y R U' R'"))).toEqual(
      caseState(caseWith(FR, "R U' R'")),
    );
  });

  it("masks FL as the x-reflection of FR", () => {
    const mirrorIndex = (i: number) => {
      const face = Math.floor(i / 9);
      const column = i % 3;
      return [0, 4, 2, 3, 1, 5][face] * 9 + Math.floor((i % 9) / 3) * 3 + (2 - column);
    };
    const swapSides = (facelet: Facelet): Facelet =>
      facelet === "R" ? "L" : facelet === "L" ? "R" : facelet;

    const fr = caseState(caseWith(FR, "R U' R'"));
    const fl = caseState(caseWith(FL, "L' U L"));

    expect(colored(fl)).toHaveLength(5);
    expect(fl).toEqual(fr.map((_, j) => swapSides(fr[mirrorIndex(j)])));
  });
});
