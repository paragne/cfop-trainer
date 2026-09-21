import { describe, expect, it } from "vitest";
import type { Case } from "../data/algorithms.ts";
import { buildQueue } from "./queue.ts";
import type { Card } from "./srs.ts";

const NOW = 1_800_000_000_000;

const mk = (id: string): Case => ({
  id,
  group: "F2L",
  sets: ["F2L"],
  section: "",
  name: null,
  aliases: [],
  algs: [{ display: "U", moves: "U" }],
  mask: { kind: "f2l", slot: "FR" },
  setup: null,
  videoUrl: null,
});

const cases = (...ids: string[]) => ids.map(mk);
const ids = (queue: Case[]) => queue.map((c) => c.id);

const card = (seen: number, known: number, due: number): Card => ({
  ease: 2.5,
  interval: 1,
  reps: 1,
  due,
  seen,
  known,
  lastGrade: 1,
});

// Small seeded generator so distribution tests are deterministic, not flaky.
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("length", () => {
  it("treats never-seen cases as due and stops at the number selected", () => {
    const all = cases("a", "b", "c", "d", "e");
    expect(buildQueue(all, {}, NOW, 20, seeded(1))).toHaveLength(5);
  });

  it("caps at the requested length when more are due", () => {
    const all = cases(..."abcdefghijklmnopqrstuvwxyz0123".split(""));
    expect(buildQueue(all, {}, NOW, 20, seeded(1))).toHaveLength(20);
  });

  it("fills only the shortfall", () => {
    const all = cases("a", "b", "c", "d", "e", "f");
    const cards = {
      c: card(4, 2, NOW + 1),
      d: card(4, 2, NOW + 1),
      e: card(4, 2, NOW + 1),
      f: card(4, 2, NOW + 1),
    };
    expect(buildQueue(all, cards, NOW, 4, seeded(1))).toHaveLength(4);
  });
});

describe("due versus fill", () => {
  it("counts a card due exactly now as due", () => {
    // If the boundary were exclusive, neither card would be due and the
    // lower-ratio card b would be filled in instead of a.
    const cards = { a: card(1, 1, NOW), b: card(1, 0, NOW + 1) };
    expect(ids(buildQueue(cases("a", "b"), cards, NOW, 1, seeded(1)))).toEqual(["a"]);
  });

  it("puts due cards first, then fills by ascending known/seen", () => {
    const cards = {
      x: card(5, 1, NOW + 1),
      y: card(2, 1, NOW + 1),
      z: card(10, 9, NOW + 1),
    };
    const queue = buildQueue(cases("d", "x", "y", "z"), cards, NOW, 3, seeded(1));
    expect(ids(queue)).toEqual(["d", "x", "y"]);
  });

  it("does not treat a card due one ms from now as due", () => {
    const cards = { b: card(2, 1, NOW + 1), c: card(5, 1, NOW + 1) };
    const queue = buildQueue(cases("a", "b", "c"), cards, NOW, 3, seeded(1));
    expect(ids(queue)).toEqual(["a", "c", "b"]);
  });

  it("never repeats a case", () => {
    const all = cases("a", "b", "c", "d", "e", "f", "g");
    const cards = { d: card(2, 1, NOW + 1), e: card(3, 3, NOW + 1) };
    for (let seed = 0; seed < 50; seed++) {
      const queue = ids(buildQueue(all, cards, NOW, 5, seeded(seed)));
      expect(new Set(queue).size).toBe(queue.length);
    }
  });

  it("leaves its inputs alone", () => {
    const all = Object.freeze(cases("a", "b", "c", "d"));
    const cards = Object.freeze({ c: Object.freeze(card(1, 0, NOW + 1)) });
    expect(() => buildQueue(all, cards, NOW, 4, seeded(1))).not.toThrow();
  });
});

describe("shuffle", () => {
  it("is a function of the injected random and nothing else", () => {
    const all = cases("a", "b", "c", "d", "e", "f", "g", "h");
    const first = ids(buildQueue(all, {}, NOW, 8, seeded(42)));
    const second = ids(buildQueue(all, {}, NOW, 8, seeded(42)));
    expect(second).toEqual(first);
  });

  it("gives every ordering of three cards an even share", () => {
    const counts = new Map<string, number>();
    const random = seeded(7);
    for (let i = 0; i < 6000; i++) {
      const key = ids(buildQueue(cases("a", "b", "c"), {}, NOW, 3, random)).join("");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(6);
    for (const n of counts.values()) {
      expect(n).toBeGreaterThan(900);
      expect(n).toBeLessThan(1100);
    }
  });
});
