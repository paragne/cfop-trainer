import { describe, expect, it } from "vitest";
import { ALL_CASES, F2L_CASES } from "../data/algorithms.ts";
import type { Case } from "../data/algorithms.ts";
import { caseState } from "./case-state.ts";
import type { CaseState, Facelet } from "./case-state.ts";
import { PIECES } from "./cube.ts";
import { renderCase, viewFor } from "./render.ts";
import type { View } from "./render.ts";

const POLYGON = /<polygon data-i="(\d+)" points="[^"]+" fill="([^"]+)"\/>/g;
const drawn = (svg: string) =>
  [...svg.matchAll(POLYGON)].map(([, i, fill]) => ({ index: Number(i), fill }));

const FACELETS: Facelet[] = ["U", "R", "F", "D", "L", "B", "masked"];
const uniform = (facelet: Facelet): CaseState => Array<Facelet>(54).fill(facelet);
const fillOf = (facelet: Facelet) => drawn(renderCase(uniform(facelet), "top"))[0].fill;

describe("fills", () => {
  it("colors a facelet from its own state entry and grays only masked ones", () => {
    const cells = drawn(renderCase(uniform("masked").with(4, "R"), "iso-fr"));
    const others = new Set(cells.filter((c) => c.index !== 4).map((c) => c.fill));
    expect(others.size).toBe(1);
    expect(cells.find((c) => c.index === 4)?.fill).toBe(fillOf("R"));
    expect(others.has(fillOf("R"))).toBe(false);
  });

  // Also what lets the distinct-pictures test below stand for "distinct
  // pictures" under any color scheme.
  it("gives the six colors and masked seven different fills", () => {
    expect(new Set(FACELETS.map(fillOf)).size).toBe(7);
  });
});

function hsl(hex: string) {
  const [r, g, b] = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const sector = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: d === 0 ? 0 : sector * 60, s, l };
}

// Bands rather than hex values, so this is not the color map restated.
function colorName(hex: string) {
  const { h, s, l } = hsl(hex);
  if (s < 0.1) return l > 0.9 ? "white" : "gray";
  if (h >= 340 || h < 10) return "red";
  if (h >= 15 && h < 40) return "orange";
  if (h >= 45 && h < 70) return "yellow";
  if (h >= 90 && h < 170) return "green";
  if (h >= 190 && h < 250) return "blue";
  return `hue ${Math.round(h)}`;
}
const nameOf = (face: Facelet) => colorName(fillOf(face));

describe("color scheme", () => {
  it.each([
    ["U", "D", "yellow", "white"],
    ["F", "B", "green", "blue"],
    ["R", "L", "orange", "red"],
  ] as const)("%s and %s, opposite faces, are %s and %s", (a, b, x, y) => {
    expect([nameOf(a), nameOf(b)].toSorted()).toEqual([x, y].toSorted());
  });

  // Opposite pairs alone pass for R red and L orange, which is a mirror-image cube.
  it("has orange on the right of a yellow-up, green-front cube", () => {
    const faces: Facelet[] = ["U", "F", "R", "L"];
    expect(faces.map(nameOf)).toEqual(["yellow", "green", "orange", "red"]);
  });

  it("renders masked as gray", () => {
    expect(nameOf("masked")).toBe("gray");
  });
});

const COUNT: Record<View, number> = { "iso-fr": 27, "iso-fl": 27, top: 21 };
const render = (c: Case) => renderCase(caseState(c), viewFor(c.mask));

describe("all cases", () => {
  // Guards against undefined or NaN leaking from a lookup. Says nothing
  // about whether a picture looks right.
  it.each(ALL_CASES)("$id renders a full, finite picture", (c) => {
    const svg = render(c);
    const cells = drawn(svg);
    expect(cells).toHaveLength(COUNT[viewFor(c.mask)]);
    expect(cells.every(({ fill }) => /^#[0-9a-f]{6}$/.test(fill))).toBe(true);
    expect(svg).not.toMatch(/NaN|undefined|Infinity/);
  });

  it.each(F2L_CASES)("$id draws its own slot's side face", (c) => {
    if (c.mask.kind !== "f2l") throw new Error(`${c.id} has no f2l mask`);
    const shown = drawn(render(c)).map((cell) => cell.index);
    const right = shown.some((i) => i >= 9 && i < 18);
    const left = shown.some((i) => i >= 36 && i < 45);
    expect([right, left]).toEqual(c.mask.slot === "FR" ? [true, false] : [false, true]);
  });
});

// Some F2L pieces hide a sticker on a back face or on D, which is normal for
// three-face pictures, so only a wholly hidden piece counts as a failure.
describe("visibility", () => {
  it.each(ALL_CASES)("$id: every colored piece has a visible sticker", (c) => {
    const state = caseState(c);
    const shown = new Set(drawn(render(c)).map((cell) => cell.index));
    const hidden = PIECES.filter((p) => p.some((i) => state[i] !== "masked") && !p.some((i) => shown.has(i)));
    expect(hidden).toEqual([]);
  });

  it.each(ALL_CASES.filter((c) => c.mask.kind !== "f2l"))("$id: the top view hides nothing colored", (c) => {
    const state = caseState(c);
    const shown = new Set(drawn(render(c)).map((cell) => cell.index));
    expect(state.flatMap((f, i) => (f !== "masked" && !shown.has(i) ? [i] : []))).toEqual([]);
  });
});

// Compares drawn pictures, not algs: two cases that differ only in a hidden
// sticker would be flagged. The view is in the key so a case only collides
// with one shown the same way.
function duplicates(cases: readonly Case[]): string[] {
  const seen = new Map<string, string>();
  return cases.flatMap((c) => {
    const key = `${viewFor(c.mask)}:${drawn(render(c)).map((cell) => cell.fill).join()}`;
    const first = seen.get(key);
    if (first === undefined) {
      seen.set(key, c.id);
      return [];
    }
    return [`${first} renders identically to ${c.id}`];
  });
}

describe("distinct pictures", () => {
  it("renders no two cases the same", () => {
    expect(duplicates(ALL_CASES)).toEqual([]);
  });

  // Without this, a pass on the real data could mean the detector is broken.
  it("names both cases when two render the same", () => {
    const [a, b] = ALL_CASES;
    expect(duplicates([a, { ...a, id: "copy" }])).toEqual([`${a.id} renders identically to copy`]);
    expect(duplicates([a, b])).toEqual([]);
  });
});
