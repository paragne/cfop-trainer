/**
 * Compiles the one shader program, builds each cubie's mesh (see piece-mesh.ts), and
 * draws every cubie each frame with per-cubie uModel/color uniforms, plus a
 * lighting pair (uLightDir/uCameraPos) recomputed from the camera each
 * frame. Every internal cube boundary has two coincident, oppositely-facing
 * triangles (this cubie's face against its neighbour's, flush at rest and
 * mid-turn alike); back-face culling plus the mesh's consistent
 * CCW-from-outside winding (see cubie-mesh.test.ts) is what keeps exactly
 * one of that coincident pair visible per view direction, instead of the
 * two z-fighting in the depth buffer.
 */
import { buildGeometry } from "./gl-geometry.ts";
import { link, requireUniform } from "./gl-program.ts";
import { coreFaceColorUniforms, faceColorUniforms } from "./face-uniforms.ts";
import { animatedModelMatrix, bakedModelMatrix } from "./cubie-model.ts";
import type { InFlight } from "./player.ts";
import { PROFILES } from "../../lib/aesthetic.ts";
import type { Aesthetic } from "../../lib/aesthetic.ts";
import { toRgb } from "../../lib/palette.ts";
import { createLogoTexture } from "./gl-logo.ts";
import type { Mat4 } from "../../lib/mat4.ts";
import type { Vec } from "../../lib/cube.ts";
import type { PhysicalCubie } from "../../lib/physical-cube.ts";
import type { ShownMask } from "../../lib/sticker-mask.ts";

export type GlScene = {
  render(cubies: readonly PhysicalCubie[], inFlight: InFlight | null, view: Mat4, projection: Mat4, eye: Vec, up: Vec): void;
  // Recolors every sticker for the given case's mask (null: every sticker
  // shows its true color, no case loaded) — `home` is the same cubies array
  // the case was just snapped to, index-aligned with every later animated
  // `cubies` (a move only ever rotates an element in place, see
  // physical-cube.ts, so index i keeps meaning "the same physical piece"
  // for as long as this case is loaded). A case whose setup needs
  // case-state.ts's normalize() (f2l-slot-3/4/5's partial-depth d) relabels
  // colors at each home slot instead of rotating a shared physical cube —
  // there is no single fixed "true color" identity to bake once at scene
  // creation and reuse across every case the way OLL/PLL cases allow.
  setMask(mask: ShownMask | null, home: readonly PhysicalCubie[]): void;
  setAesthetic(aesthetic: Aesthetic): void;
};

// Plastic body: what shows wherever a look has no color, so a shade off pure
// black keeps the bevels readable under the lighting.
const BODY = toRgb("#0d0d0d");

const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (v: Vec, k: number): Vec => [v[0] * k, v[1] * k, v[2] * k];
const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalize = (v: Vec): Vec => scale(v, 1 / Math.hypot(...v));

// Up-and-to-the-left of the camera, recomputed every frame from its current
// basis so the light stays camera-relative (never dims a face just because
// the free camera orbited away from a world-fixed light).
function cameraRelativeLightDir(eye: Vec, up: Vec): Vec {
  const back = normalize(eye);
  const right = normalize(cross(up, back));
  return normalize(add(add(scale(up, 0.6), scale(right, -0.7)), scale(back, 0.5)));
}

// `background` is the clear color. The dev page's pixel checks read it back to
// tell a gap in the cube from a face, so they need it distinct from every
// face color, which the app's black does not have to be.
export function createGlScene(
  gl: WebGL2RenderingContext,
  homeCubies: readonly PhysicalCubie[],
  coreIndex: number,
  background: readonly [number, number, number],
  onLogoReady: () => void,
): GlScene {
  const program = link(gl);
  const { vao, ranges } = buildGeometry(gl, program, homeCubies, coreIndex);

  const uProjection = requireUniform(gl, program, "uProjection");
  const uView = requireUniform(gl, program, "uView");
  const uModel = requireUniform(gl, program, "uModel");
  const uFaceColor = requireUniform(gl, program, "uFaceColor");
  const uFaceVisible = requireUniform(gl, program, "uFaceVisible");
  const uLightDir = requireUniform(gl, program, "uLightDir");
  const uCameraPos = requireUniform(gl, program, "uCameraPos");
  const uBlackInternals = requireUniform(gl, program, "uBlackInternals");
  const uStickered = requireUniform(gl, program, "uStickered");
  const uBody = requireUniform(gl, program, "uBody");
  const uHome = requireUniform(gl, program, "uHome");
  const uLogo = requireUniform(gl, program, "uLogo");
  const uLogoFace = requireUniform(gl, program, "uLogoFace");
  const uLogoColumn = requireUniform(gl, program, "uLogoColumn");
  const uLogoRow = requireUniform(gl, program, "uLogoRow");
  createLogoTexture(gl, onLogoReady);
  let profile = PROFILES.moyu;
  let faceUniforms = homeCubies.map((cubie, i) => (i === coreIndex ? coreFaceColorUniforms() : faceColorUniforms(cubie, null)));

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.frontFace(gl.CCW);

  function render(cubies: readonly PhysicalCubie[], inFlight: InFlight | null, view: Mat4, projection: Mat4, eye: Vec, up: Vec): void {
    gl.clearColor(background[0], background[1], background[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.uniformMatrix4fv(uProjection, false, [...projection]);
    gl.uniformMatrix4fv(uView, false, [...view]);
    gl.uniform3fv(uLightDir, cameraRelativeLightDir(eye, up));
    gl.uniform3fv(uCameraPos, eye);
    gl.uniform1f(uBlackInternals, profile.internals === "black" ? 1 : 0);
    gl.uniform1f(uStickered, profile.stickered ? 1 : 0);
    gl.uniform3fv(uBody, BODY);
    gl.uniform1i(uLogo, 0);

    cubies.forEach((cubie, i) => {
      const model =
        inFlight !== null && inFlight.movingCubieIndices.has(i)
          ? animatedModelMatrix(cubie, inFlight.axis, inFlight.angleDeg)
          : bakedModelMatrix(cubie);
      gl.uniformMatrix4fv(uModel, false, [...model]);
      const { color, visible, logo } = faceUniforms[i];
      gl.uniform3fv(uHome, homeCubies[i].position);
      gl.uniform1i(uLogoFace, logo === null ? -1 : logo.face);
      gl.uniform3fv(uLogoColumn, logo === null ? [0, 0, 0] : logo.column);
      gl.uniform3fv(uLogoRow, logo === null ? [0, 0, 0] : logo.row);
      gl.uniform3fv(uFaceColor, color);
      gl.uniform1fv(uFaceVisible, visible);
      gl.drawArrays(gl.TRIANGLES, ranges[i].first, ranges[i].count);
    });

    gl.bindVertexArray(null);
  }

  function setMask(mask: ShownMask | null, home: readonly PhysicalCubie[]): void {
    faceUniforms = home.map((cubie, i) => (i === coreIndex ? coreFaceColorUniforms() : faceColorUniforms(cubie, mask)));
  }

  function setAesthetic(aesthetic: Aesthetic): void {
    profile = PROFILES[aesthetic];
  }

  return { render, setMask, setAesthetic };
}
