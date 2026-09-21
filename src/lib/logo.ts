import { SOLVED } from "./cube.ts";
import { renderCase } from "./render.ts";
import type { Palette } from "./render.ts";

const LAVENDER = "#c4b5fd";
// The accent color, so the brand and the primary action are the same violet.
const VIOLET = "#a78bfa";
const MID = "#6d4fc4";

// The F2L isometric view shows only U, F and R. The other keys are never read
// and just complete the record.
export const LOGO_PALETTE: Palette = {
  U: LAVENDER,
  F: VIOLET,
  R: MID,
  D: MID,
  L: MID,
  B: MID,
  masked: MID,
};

// A solved cube through the same renderer as every case picture, so the mark
// cannot drift from the app's own cubes.
export const logoSvg = (): string => renderCase(SOLVED, "iso-fr", LOGO_PALETTE);
