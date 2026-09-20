import { describe, expect, it } from "vitest";
import { applyMoves, normalize, SOLVED } from "./cube.ts";
import { parse } from "./notation.ts";
import type { MoveName } from "./notation.ts";

const NAMES: MoveName[] = [
  "U", "D", "L", "R", "F", "B",
  "u", "d", "l", "r", "f", "b",
  "M", "E", "S",
  "x", "y", "z",
];
const EVERY_FORM = NAMES.flatMap((name) => ["", "'", "2"].map((s) => name + s));

// Pushing 0..53 through a move reads its permutation directly.
const IDENTITY = Array.from({ length: 54 }, (_, i) => i);
const perm = (alg: string) => applyMoves(IDENTITY, parse(alg));
const stickers = (alg: string) => applyMoves(SOLVED, parse(alg));
const faces = (...rows: string[]) => [...rows.join("")];

function orderOf(alg: string): number {
  for (let k = 1; k <= 12; k++) {
    const repeated = Array<string>(k).fill(alg).join(" ");
    if (perm(repeated).every((from, to) => from === to)) return k;
  }
  throw new Error(`${alg} has order above 12`);
}

describe("SOLVED", () => {
  it("has nine stickers per color in U R F D L B order", () => {
    expect(SOLVED).toEqual(
      faces(
        "UUUUUUUUU", "RRRRRRRRR", "FFFFFFFFF",
        "DDDDDDDDD", "LLLLLLLLL", "BBBBBBBBB",
      ),
    );
  });
});

describe("move tables", () => {
  it.each(EVERY_FORM)("%s is a permutation of all 54 stickers", (form) => {
    expect(new Set(perm(form)).size).toBe(54);
  });

  it.each(NAMES)("%s four times is the identity", (name) => {
    expect(perm(`${name} ${name} ${name} ${name}`)).toEqual(IDENTITY);
  });

  it.each(NAMES)("%s' undoes %s", (name) => {
    expect(perm(`${name} ${name}'`)).toEqual(IDENTITY);
  });

  it.each(NAMES)("%s2 is two %s and %s' is three", (name) => {
    expect(perm(`${name}2`)).toEqual(perm(`${name} ${name}`));
    expect(perm(`${name}'`)).toEqual(perm(`${name} ${name} ${name}`));
  });

  const MOVED: [string, number][] = [
    ["UDLRFB", 20],
    ["MES", 12],
    ["udlrfb", 32],
    ["xyz", 52],
  ];
  it.each(
    MOVED.flatMap(([names, count]) =>
      [...names].map((name): [string, number] => [name, count]),
    ),
  )("%s moves %i stickers", (name, count) => {
    expect(perm(name).filter((from, to) => from !== to)).toHaveLength(count);
  });
});

describe("single moves from solved", () => {
  // Each expected state is derived by hand from which face feeds which.
  it.each([
    ["U", faces("UUUUUUUUU", "BBBRRRRRR", "RRRFFFFFF", "DDDDDDDDD", "FFFLLLLLL", "LLLBBBBBB")],
    ["R", faces("UUFUUFUUF", "RRRRRRRRR", "FFDFFDFFD", "DDBDDBDDB", "LLLLLLLLL", "UBBUBBUBB")],
    ["F", faces("UUUUUULLL", "URRURRURR", "FFFFFFFFF", "RRRDDDDDD", "LLDLLDLLD", "BBBBBBBBB")],
    ["M", faces("UBUUBUUBU", "RRRRRRRRR", "FUFFUFFUF", "DFDDFDDFD", "LLLLLLLLL", "BDBBDBBDB")],
    ["x", faces("FFFFFFFFF", "RRRRRRRRR", "DDDDDDDDD", "BBBBBBBBB", "LLLLLLLLL", "UUUUUUUUU")],
    ["y", faces("UUUUUUUUU", "BBBBBBBBB", "RRRRRRRRR", "DDDDDDDDD", "FFFFFFFFF", "LLLLLLLLL")],
  ])("%s", (alg, expected) => {
    expect(stickers(alg)).toEqual(expected);
  });
});

describe("known group structure", () => {
  it.each([
    ["R", 4],
    ["R2", 2],
    ["R U R' U'", 6],
    ["R U R' U R U2 R'", 6],
    ["R U R' U' R' F R2 U' R' U' R U R' F'", 2],
    ["M2 U' M2 U2 M2 U' M2", 2],
  ])("%s has order %i", (alg, order) => {
    expect(orderOf(alg)).toBe(order);
  });

  it.each([
    ["r", "x L"],
    ["l", "x' R"],
    ["u", "y D"],
    ["d", "y' U"],
    ["f", "z B"],
    ["b", "z' F"],
  ])("%s equals %s", (wide, equivalent) => {
    expect(perm(wide)).toEqual(perm(equivalent));
  });

  it("d turns two layers, which D y' does not", () => {
    expect(perm("d")).not.toEqual(perm("D y'"));
  });
});

describe("applyMoves", () => {
  it("does not mutate its input", () => {
    const input = Object.freeze([...SOLVED]);
    expect(applyMoves(input, parse("R U"))).not.toEqual(SOLVED);
    expect(input).toEqual(SOLVED);
  });

  it("returns a copy for an empty sequence", () => {
    expect(applyMoves(SOLVED, [])).toEqual(SOLVED);
  });
});

describe("normalize", () => {
  it("leaves a state with home centers alone", () => {
    const cube = stickers("R U R' U'");
    expect(normalize(cube)).toEqual(cube);
  });

  it.each(["x", "y", "z", "x2", "y' x z2"])("undoes the rotation %s", (rotation) => {
    expect(normalize(stickers(rotation))).toEqual(SOLVED);
  });

  it.each([
    "R U R' U'",
    "r U R' U' r' F R F'",
    "M2 U' M2 U2 M2 U' M2",
    "R U' R' d R' U' R",
  ])("ignores a rotation held before %s", (alg) => {
    expect(normalize(stickers(`y x' z2 ${alg}`))).toEqual(
      normalize(stickers(alg)),
    );
  });

  it("reads d as a U turn once the centers are home", () => {
    expect(normalize(stickers("d"))).toEqual(stickers("U"));
  });

  it("reads M as R L' once the centers are home", () => {
    expect(normalize(stickers("M"))).toEqual(stickers("R L'"));
  });
});
