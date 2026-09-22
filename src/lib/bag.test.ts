import { describe, expect, it } from "vitest";
import { draw } from "./bag.ts";
import { mk } from "./session.fixture.ts";

const pool = ["a", "b", "c"].map((id) => mk(id));

// Mulberry32, so every seed is reproducible.
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe("draw", () => {
  it("takes the head of a non-empty bag and leaves the rest", () => {
    const next = draw(pool, [pool[1], pool[2]], pool[0], () => {
      throw new Error("random was called");
    });
    expect(next.current.id).toBe("b");
    expect(next.bag.map((c) => c.id)).toEqual(["c"]);
  });

  it("starts a new pass from the whole pool when the bag is empty", () => {
    const next = draw(pool, [], pool[0], seeded(1));
    expect([next.current, ...next.bag].map((c) => c.id).toSorted()).toEqual(["a", "b", "c"]);
  });

  // Without the guard, about a third of these would open on the previous case.
  it.each(Array.from({ length: 60 }, (_, seed) => seed))(
    "never opens a new pass on the case just shown (seed %i)",
    (seed) => {
      for (const previous of pool) {
        expect(draw(pool, [], previous, seeded(seed)).current.id).not.toBe(previous.id);
      }
    },
  );
});
