/**
 * The hidden-face color rule: every point on a cubie takes the color of the
 * nearest of that cubie's visible (sticker) faces, measured in the cubie's
 * own local coordinates — not "the color of the opposite sticker," which is
 * wrong (a corner's underside shows its top color, not its bottom's). `normal`
 * must be the *local* (unrotated, home) axis, e.g. ALL_AXES[k], never a
 * cubie.faces[k].normal that has been rotated to the cubie's current world
 * orientation — a mesh vertex's local position is always ALL_AXES-aligned
 * regardless of orientation, since the model matrix carries rotation, not
 * the mesh.
 *
 * Ported independently into gl-shaders.ts's fragment shader rather than
 * shared with it (GLSL can't import this), the same way mat4.ts's
 * rotationAboutAxis re-derives Rodrigues' formula instead of importing
 * rotate-by-angle.ts's cross-checked twin — this file's tests are what prove
 * the shader port is correct.
 */
import type { Color, Vec } from "../../lib/cube.ts";

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function nearestVisibleFace(
  localPosition: Vec,
  visibleFaces: readonly { normal: Vec; color: Color }[],
): Color {
  let best = visibleFaces[0];
  if (best === undefined) throw new Error("nearestVisibleFace: no visible faces");
  let bestScore = dot(localPosition, best.normal);
  for (const face of visibleFaces.slice(1)) {
    const score = dot(localPosition, face.normal);
    if (score > bestScore) {
      best = face;
      bestScore = score;
    }
  }
  return best.color;
}
