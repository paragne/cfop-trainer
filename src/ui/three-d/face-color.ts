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
import { STICKER_INSET, STICKER_MIN_RADIUS } from "../../lib/aesthetic.ts";
import type { Profile } from "../../lib/aesthetic.ts";
import type { Color, Vec } from "../../lib/cube.ts";
import { ALL_AXES } from "../../lib/physical-cube.ts";
import { BEVEL_RADIUS } from "./cubie-mesh.ts";
import { CURVE_RADIUS, cutsCorner, SHELL_DEPTH } from "./piece-shape.ts";

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

// Signed distance from a point on face `axis` to its sticker's outline, negative
// inside: the piece's own outline (see piece-mesh.ts, which rounds the corner of
// a face that points to the middle of the cube face) drawn STICKER_INSET in.
function stickerDistance(local: Vec, axis: number, home: Vec): number {
  const a = (axis + 1) % 3;
  const b = (axis + 2) % 3;
  const sa = local[a] < 0 ? -1 : 1;
  const sb = local[b] < 0 ? -1 : 1;
  const outline = cutsCorner(home, a, b, sa, sb) ? CURVE_RADIUS : BEVEL_RADIUS;
  const r = Math.max(outline - STICKER_INSET, STICKER_MIN_RADIUS);
  const dx = Math.abs(local[a]) - (0.5 - STICKER_INSET - r);
  const dy = Math.abs(local[b]) - (0.5 - STICKER_INSET - r);
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r;
}

// The rule gl-shaders.ts applies for a non-split profile, in TS so it can be
// tested: the face a point belongs to is the axis its surface faces, and it
// shows that face's color only if the cubie has a sticker there (and, for a
// stickered profile, only inside the sticker's outline), otherwise body. A
// stickerless piece's rolled edge, facing the gap, keeps the color of the outer
// face whose shell it is part of: the nearest visible face, so two shells that
// overlap on an inner wall meet on an even mitre. The shader softens both
// edges; this takes each as a hard cut, the shell's at SHELL_DEPTH. `home` is the piece's
// position in the solved cube.
export function shadeSurface(
  localPosition: Vec,
  localNormal: Vec,
  visibleFaces: readonly { normal: Vec; color: Color }[],
  profile: Profile,
  home: Vec,
): Color | "body" {
  if (profile.internals === "split") return nearestVisibleFace(localPosition, visibleFaces);
  let faceIndex = 0;
  let best = -Infinity;
  ALL_AXES.forEach((candidate, i) => {
    const score = dot(localNormal, candidate);
    if (score > best) {
      best = score;
      faceIndex = i;
    }
  });
  const face = visibleFaces.find((f) => dot(f.normal, ALL_AXES[faceIndex]) === 1);
  if (face === undefined) {
    if (profile.stickered) return "body";
    const nearest = visibleFaces.reduce((best, f) => (dot(f.normal, localPosition) > dot(best.normal, localPosition) ? f : best));
    return dot(nearest.normal, localPosition) >= SHELL_DEPTH ? nearest.color : "body";
  }
  if (profile.stickered && stickerDistance(localPosition, Math.floor(faceIndex / 2), home) > 0) return "body";
  return face.color;
}
