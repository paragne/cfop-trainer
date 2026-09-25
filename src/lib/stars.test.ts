import { describe, expect, it } from "vitest";
import { ALL_CASES } from "../data/algorithms.ts";
import { setStar } from "./progress-edit.ts";
import { defaultProgress } from "./progress.ts";
import { starredAlg } from "./stars.ts";

const multi = ALL_CASES.find((c) => c.algs.length >= 3);
if (multi === undefined) throw new Error("no case with three algs");

describe("starredAlg", () => {
  it("is the primary when nothing is starred", () => {
    expect(starredAlg(multi, {})).toBe(0);
  });

  it("is the starred index when it exists", () => {
    expect(starredAlg(multi, { [multi.id]: 2 })).toBe(2);
  });

  it("falls back to the primary when the index is past the case's algs", () => {
    expect(starredAlg(multi, { [multi.id]: multi.algs.length })).toBe(0);
  });

  it("ignores a star on another case", () => {
    expect(starredAlg(multi, { other: 2 })).toBe(0);
  });
});

describe("setStar", () => {
  it("stores an alternate, moves the star, and deletes it for the primary", () => {
    const starred = setStar(defaultProgress(), multi.id, 2);
    expect(starred.stars).toEqual({ [multi.id]: 2 });
    expect(setStar(starred, multi.id, 1).stars).toEqual({ [multi.id]: 1 });
    expect(setStar(starred, multi.id, 0).stars).toEqual({});
  });

  it("leaves its input alone", () => {
    const before = defaultProgress();
    setStar(before, multi.id, 1);
    expect(before.stars).toEqual({});
  });
});
