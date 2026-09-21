import { describe, expect, it } from "vitest";
import { shuffle } from "./shuffle.ts";

describe("shuffle", () => {
  it("swaps each position with one at or before it, from the end", () => {
    expect(shuffle(["a", "b", "c", "d"], () => 0)).toEqual(["b", "c", "d", "a"]);
    expect(shuffle(["a", "b", "c", "d"], () => 0.999)).toEqual(["a", "b", "c", "d"]);
  });

  it("does not change its input", () => {
    const items = [1, 2, 3, 4, 5];
    shuffle(items, () => 0);
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });

  it("keeps every item exactly once", () => {
    const items = Array.from({ length: 30 }, (_, i) => i);
    expect(shuffle(items, Math.random).toSorted((a, b) => a - b)).toEqual(items);
  });

  it("returns an empty list for an empty list", () => {
    expect(shuffle([], () => 0)).toEqual([]);
  });
});
