import { describe, expect, it } from "vitest";
import { invert, parse, stringify } from "./notation.ts";
import type { MoveName } from "./notation.ts";

const NAMES: MoveName[] = [
  "U", "D", "L", "R", "F", "B",
  "u", "d", "l", "r", "f", "b",
  "M", "E", "S",
  "x", "y", "z",
];
const SUFFIXES = ["", "'", "2", "2'"];

const EVERY_FORM = NAMES.flatMap((name) => SUFFIXES.map((s) => name + s));

describe("parse and stringify", () => {
  it.each(EVERY_FORM)("round-trips %s", (form) => {
    expect(stringify(parse(form))).toBe(form);
  });

  it.each([
    "R U R' U'",
    "U' R U R' U2 R U' R'",
    "R U2' R' d R' U2' R",
    "M2 U' M2 U2 M2 U' M2",
    "r U R' U' r' F R F'",
    "",
  ])("round-trips the sequence %j", (alg) => {
    expect(stringify(parse(alg))).toBe(alg);
  });

  it("keeps the prime on a half turn", () => {
    expect(parse("R2'")).toEqual([{ name: "R", turns: 2, prime: true }]);
    expect(parse("R2")).toEqual([{ name: "R", turns: 2, prime: false }]);
    expect(parse("R'")).toEqual([{ name: "R", turns: 1, prime: true }]);
  });

  it("normalizes whitespace", () => {
    expect(stringify(parse("  R\n\tU   R'  "))).toBe("R U R'");
  });
});

describe("groups", () => {
  it("strips parentheses and brackets", () => {
    expect(stringify(parse("U' (R U R') [U2 R U' R']"))).toBe(
      "U' R U R' U2 R U' R'",
    );
  });

  it("expands (X)*N to N copies", () => {
    const moves = parse("(R U R' U')*3");
    expect(moves).toHaveLength(12);
    expect(stringify(moves)).toBe("R U R' U' R U R' U' R U R' U'");
  });

  it("treats *1 as a single copy", () => {
    expect(stringify(parse("(R U)*1"))).toBe("R U");
  });

  it("nests", () => {
    expect(stringify(parse("((R U)*2 F)*2"))).toBe(
      "R U R U F R U R U F",
    );
  });

  it("expands a bracket repeat", () => {
    expect(stringify(parse("[R U]*2 F"))).toBe("R U R U F");
  });
});

describe("invalid input", () => {
  it.each([
    "Q",
    "Rw",
    "R3",
    "R'2",
    "R2''",
    "(R U",
    "R U)",
    "(R U]",
    "[R U)",
    "R*3",
    "(R)*",
    "(R)*x",
    "(R)*0",
    "(R)*2*2",
  ])("throws on %j", (alg) => {
    expect(() => parse(alg)).toThrow();
  });
});

describe("invert", () => {
  it("reverses the order and flips each quarter turn", () => {
    expect(stringify(invert(parse("R U R' U'")))).toBe("U R U' R'");
  });

  it("leaves half turns as written", () => {
    expect(stringify(invert(parse("R2 U2' F2")))).toBe("F2 U2' R2");
  });

  it("is its own inverse", () => {
    const alg = parse("U' R U2' R' d R' U2' R");
    expect(invert(invert(alg))).toEqual(alg);
  });

  it("inverts nothing to nothing", () => {
    expect(invert([])).toEqual([]);
  });
});
