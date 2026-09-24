import { CENTERS, FACES } from "./cube.ts";
import type { Color, Cube } from "./cube.ts";

export type ViewFaces = { top: Color; left: Color; right: Color };

// The position a center's color has moved to. A face is named by where it is,
// and a center is the one piece of a face that never leaves it, so wherever
// the U-colored center is now is where the piece-face that started on top is.
function positionOf(cube: Cube, color: Color): Color {
  const i = CENTERS.findIndex((center) => cube[center] === color);
  if (i < 0) throw new Error(`no center is colored ${color}`);
  return FACES[i];
}

// What the locked camera shows in the F2L view, named as notation names faces.
// The camera follows the cube through an x, y or z, so the faces on screen stay
// the same pieces while the letters an algorithm uses for them change: after a
// y the piece-face that was front is now on the left, and the next move called
// R turns what was the back. Front-right cases show F on the left and R on the
// right, front-left cases show L and F.
export function viewFaces(cube: Cube, slot: "FR" | "FL"): ViewFaces {
  const [left, right]: [Color, Color] = slot === "FR" ? ["F", "R"] : ["L", "F"];
  return { top: positionOf(cube, "U"), left: positionOf(cube, left), right: positionOf(cube, right) };
}
