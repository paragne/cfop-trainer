import { describe, expect, it } from "vitest";
import { ALL_CASES } from "../../data/algorithms.ts";
import { AUFS, prefixed, turnState } from "../../lib/auf.ts";
import type { Auf } from "../../lib/auf.ts";
import { caseMask, caseState } from "../../lib/case-state.ts";
import { applyMoves, STICKERS } from "../../lib/cube.ts";
import { parse } from "../../lib/notation.ts";
import { FILL, GRAY, toRgb } from "../../lib/palette.ts";
import { applyAlgToCubies, colorsAtCubies, cubiesFromColors } from "../../lib/physical-cube.ts";
import { playStart } from "../../lib/play.ts";
import { faceColorUniforms } from "./face-uniforms.ts";

// F2L never takes an AUF: a U turn there is a different case.
const NO_AUF: readonly Auf[] = [""];
const aufsFor = (group: string): readonly Auf[] => (group === "F2L" ? NO_AUF : AUFS);
const rows = ALL_CASES.flatMap((c) => aufsFor(c.group).map((auf) => [c.id, c, auf] as const));

const sameVec = (a: readonly number[], b: readonly number[]) => a.every((n, i) => n === b[i]);

describe("the 3D start state", () => {
  it.each(rows)("%s with AUF %j shows the 2D picture's stickers, mask included", (_id, c, auf) => {
    const shown = turnState(caseState(c), auf);
    for (const cubie of cubiesFromColors(playStart(c, auf))) {
      const { color } = faceColorUniforms(cubie, caseMask(c));
      cubie.faces.forEach((face, i) => {
        if (!face.isSticker) return;
        const slot = STICKERS.findIndex((s) => sameVec(s.position, cubie.position) && sameVec(s.normal, face.normal));
        const facelet = shown[slot];
        const rgb = toRgb(facelet === "masked" ? GRAY : FILL[facelet]);
        expect(Array.from(color.slice(i * 3, i * 3 + 3))).toEqual(Array.from(Float32Array.from(rgb)));
      });
    }
  });

  it.each(rows)("%s with AUF %j animates to where the engine puts the same moves", (_id, c, auf) => {
    const moves = parse(prefixed(auf, c.algs[0].moves));
    const played = applyAlgToCubies(cubiesFromColors(playStart(c, auf)), moves);
    expect(colorsAtCubies(played)).toEqual(applyMoves(playStart(c, auf), moves));
  });
});
