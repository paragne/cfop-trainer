import { describe, expect, it } from "vitest";
import { ALL_CASES } from "../data/algorithms.ts";
import { defaultProgress, parseProgress, serialize } from "./progress.ts";

const [A, B] = ALL_CASES.map((c) => c.id);
const NOW = 1_800_000_000_000;

const blob = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ version: 2, updatedAt: NOW, prefs: {}, cards: {}, notes: {}, ...over });
const parse = (text: string) => parseProgress(text, ALL_CASES);
const progress = (stars: Record<string, number>) => ({ ...defaultProgress(), stars });

describe("stars", () => {
  it.each([
    ["a list", []],
    ["a fractional index", { [A]: 1.5 }],
    ["a negative index", { [A]: -1 }],
    ["a string index", { [A]: "1" }],
  ])("rejects %s", (_name, stars) => {
    expect(parse(blob({ stars })).ok).toBe(false);
  });

  it("round-trip, and a blob without the key reads as none", () => {
    const original = progress({ [A]: 1, [B]: 2 });
    const back = parseProgress(serialize(original, NOW), ALL_CASES);
    expect(back.ok && back.progress.stars).toEqual({ [A]: 1, [B]: 2 });
    const bare = parse(blob());
    expect(bare.ok && bare.progress.stars).toEqual({});
  });

  it("drop unknown case ids with a count, and keep an index no alg reaches", () => {
    const result = parse(blob({ stars: { [A]: 99, "ghost-3": 1 } }));
    expect(result).toMatchObject({ ok: true, dropped: 1 });
    if (result.ok) expect(result.progress.stars).toEqual({ [A]: 99 });
  });
});
