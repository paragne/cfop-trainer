import { describe, expect, it } from "vitest";
import { ALL_CASES } from "../data/algorithms.ts";
import { AUFS, pickAuf, prefixed, turnState } from "./auf.ts";
import type { Auf } from "./auf.ts";
import { caseState, setupCube } from "./case-state.ts";
import { applyMoves, normalize, SOLVED } from "./cube.ts";
import { invert, parse, stringify } from "./notation.ts";

const LAST_LAYER = ALL_CASES.filter((c) => c.group !== "F2L");
const PAIRS = LAST_LAYER.flatMap((c) => AUFS.map((auf) => [c.id, auf] as const));
const byId = (id: string) => {
  const c = ALL_CASES.find((known) => known.id === id);
  if (c === undefined) throw new Error(`no case ${id}`);
  return c;
};

const range = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => from + i);
// The D face, the lower two rows of the sides, and the U face.
const ORIENTED = [
  ...range(0, 9),
  ...range(27, 36),
  ...[9, 18, 36, 45].flatMap((start) => range(start + 3, start + 9)),
];

const solve = (id: string, auf: Auf, text: string) =>
  normalize(applyMoves(turnState(setupCube(byId(id)), auf), parse(prefixed(auf, text))));

describe("the turned picture and the prefixed alg agree", () => {
  it("has the 83 OLL and PLL cases in play", () => {
    expect(LAST_LAYER).toHaveLength(83);
  });

  // Normalized after, like algorithms-structure.test.ts: oll-42 ends with the
  // centers displaced and would otherwise read as unsolved.
  it.each(PAIRS)("%s with AUF %j: algs[0] solves the picture exactly", (id, auf) => {
    expect(solve(id, auf, byId(id).algs[0].moves)).toEqual(SOLVED);
  });

  it.each(PAIRS)("%s with AUF %j: every alg leaves F2L and the U face solved", (id, auf) => {
    for (const alg of byId(id).algs) {
      const after = solve(id, auf, alg.moves);
      expect(ORIENTED.filter((i) => after[i] !== SOLVED[i])).toEqual([]);
    }
  });

  // Without this, the suite above would pass for an AUF that does nothing.
  // U2 is its own inverse, so it cannot show a wrong turn direction, but U and
  // U' can.
  it.each(["U", "U'", "U2"] as const)("leaves Sune unsolved without the %s prefix", (auf) => {
    const sune = byId("oll-27");
    const turned = turnState(setupCube(sune), auf);
    const after = normalize(applyMoves(turned, parse(sune.algs[0].moves)));
    expect(after).not.toEqual(SOLVED);
  });

  // A mask is a set of piece kinds, so it should turn with the cube. Computed
  // independently by playing the turn inside the setup, then masking.
  it.each(PAIRS)("%s with AUF %j: turning the mask equals masking the turned cube", (id, auf) => {
    const c = byId(id);
    expect(c.setup).toBeNull();
    const setup = stringify([...invert(parse(c.algs[0].moves)), ...invert(parse(auf))]);
    expect(turnState(caseState(c), auf)).toEqual(caseState({ ...c, setup }));
  });
});

describe("prefixed", () => {
  it.each([
    ["", "R U", "R U"],
    ["", "U' U R", "U' U R"],
    ["U", "R U", "U R U"],
    ["U2", "R U", "U2 R U"],
    ["U", "U R", "U2 R"],
    ["U'", "U R", "R"],
    ["U", "U' R", "R"],
    ["U2", "U R", "U' R"],
    ["U2", "U2 R", "R"],
    ["U'", "U' R", "U2 R"],
    ["U", "U' U R", "U R"],
    ["U2", "U2' R", "R"],
    ["U", "U (R U R) D", "U2 (R U R) D"],
    ["U'", "U(R U R')", "(R U R')"],
  ])("puts %j before %j to give %j", (auf, text, expected) => {
    expect(prefixed(auf as Auf, text)).toBe(expected);
  });

  it.each([
    ["U", "(U R U' R') R", "U (U R U' R') R"],
    ["U'", "[U R] U", "U' [U R] U"],
  ])("does not merge into a group: %j before %j", (auf, text, expected) => {
    expect(prefixed(auf as Auf, text)).toBe(expected);
  });

  it("leaves no adjacent U turns in any displayed OLL or PLL alg", () => {
    const adjacent = /(^|[\s(])U[2']*\s+U/;
    for (const c of LAST_LAYER) {
      for (const alg of c.algs) {
        for (const auf of AUFS) {
          expect(prefixed(auf, alg.display), `${c.id} ${auf}`).not.toMatch(adjacent);
        }
      }
    }
  });

  it.each(PAIRS)("%s with AUF %j: display and moves do the same as an unmerged prefix", (id, auf) => {
    for (const { display, moves } of byId(id).algs) {
      const expected = applyMoves(SOLVED, parse(`${auf} ${moves}`));
      expect(applyMoves(SOLVED, parse(prefixed(auf, display)))).toEqual(expected);
      expect(applyMoves(SOLVED, parse(prefixed(auf, moves)))).toEqual(expected);
    }
  });
});

describe("pickAuf", () => {
  const boom = () => {
    throw new Error("random was called");
  };
  const oll = byId("oll-27");
  const f2l = ALL_CASES.filter((c) => c.group === "F2L");

  it("draws each of the four turns", () => {
    const drawn = [0, 0.25, 0.5, 0.75, 0.999].map((value) => pickAuf(oll, true, () => value));
    expect(drawn).toEqual(["", "U", "U'", "U2", "U2"]);
  });

  it("never turns an F2L case, and does not draw for one", () => {
    expect(f2l).toHaveLength(77);
    for (const c of f2l) expect(pickAuf(c, true, boom)).toBe("");
  });

  it("does not turn or draw when the toggle is off", () => {
    expect(pickAuf(oll, false, boom)).toBe("");
  });
});
