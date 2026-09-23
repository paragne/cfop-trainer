/**
 * Compiles the one shader program, builds the one shared cubie mesh, and
 * draws every cubie each frame with per-cubie uModel/color uniforms, plus a
 * lighting pair (uLightDir/uCameraPos) recomputed from the camera each
 * frame. Every internal cube boundary has two coincident, oppositely-facing
 * triangles (this cubie's face against its neighbour's, flush at rest and
 * mid-turn alike); back-face culling plus the mesh's consistent
 * CCW-from-outside winding (see cubie-mesh.test.ts) is what keeps exactly
 * one of that coincident pair visible per view direction, instead of the
 * two z-fighting in the depth buffer.
 */
import { unitCubeVertices } from "./cubie-mesh.ts";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./gl-shaders.ts";
import { coreFaceColorUniforms, faceColorUniforms } from "./face-uniforms.ts";
import { animatedModelMatrix, bakedModelMatrix } from "./cubie-model.ts";
import type { InFlight } from "./player.ts";
import type { Mat4 } from "../../lib/mat4.ts";
import type { Vec } from "../../lib/cube.ts";
import type { PhysicalCubie } from "../../lib/physical-cube.ts";
import type { Mask } from "../../data/algorithms.ts";

export type GlScene = {
  render(cubies: readonly PhysicalCubie[], inFlight: InFlight | null, view: Mat4, projection: Mat4, eye: Vec, up: Vec): void;
  // Recolors every sticker for the given case's mask (null: every sticker
  // shows its true color, no case loaded).
  setMask(mask: Mask | null): void;
};

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (shader === null) throw new Error("createShader failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`shader compile failed: ${info ?? "unknown error"}`);
  }
  return shader;
}

function link(gl: WebGL2RenderingContext): WebGLProgram {
  const program = gl.createProgram();
  if (program === null) throw new Error("createProgram failed");
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`program link failed: ${info ?? "unknown error"}`);
  }
  return program;
}

function requireAttrib(gl: WebGL2RenderingContext, program: WebGLProgram, name: string): number {
  const loc = gl.getAttribLocation(program, name);
  if (loc === -1) throw new Error(`missing attribute ${name}`);
  return loc;
}

function requireUniform(gl: WebGL2RenderingContext, program: WebGLProgram, name: string): WebGLUniformLocation {
  const loc = gl.getUniformLocation(program, name);
  if (loc === null) throw new Error(`missing uniform ${name}`);
  return loc;
}

const FLOATS_PER_VERTEX = 6; // position(3) + normal(3)

function buildVertexArray(gl: WebGL2RenderingContext, program: WebGLProgram): number {
  const vertices = unitCubeVertices();
  const data = new Float32Array(vertices.length * FLOATS_PER_VERTEX);
  vertices.forEach((v, i) => data.set([...v.position, ...v.normal], i * FLOATS_PER_VERTEX));
  const buffer = gl.createBuffer();
  if (buffer === null) throw new Error("createBuffer failed");
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  const stride = FLOATS_PER_VERTEX * 4;
  const aPosition = requireAttrib(gl, program, "aPosition");
  const aNormal = requireAttrib(gl, program, "aNormal");
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(aNormal);
  gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, stride, 3 * 4);
  return vertices.length;
}

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

export function createGlScene(gl: WebGL2RenderingContext, homeCubies: readonly PhysicalCubie[], coreIndex: number): GlScene {
  const program = link(gl);
  const vao = gl.createVertexArray();
  if (vao === null) throw new Error("createVertexArray failed");
  gl.bindVertexArray(vao);
  const vertexCount = buildVertexArray(gl, program);
  gl.bindVertexArray(null);

  const uProjection = requireUniform(gl, program, "uProjection");
  const uView = requireUniform(gl, program, "uView");
  const uModel = requireUniform(gl, program, "uModel");
  const uFaceColor = requireUniform(gl, program, "uFaceColor");
  const uFaceVisible = requireUniform(gl, program, "uFaceVisible");
  const uLightDir = requireUniform(gl, program, "uLightDir");
  const uCameraPos = requireUniform(gl, program, "uCameraPos");
  let faceUniforms = homeCubies.map((cubie, i) => (i === coreIndex ? coreFaceColorUniforms() : faceColorUniforms(cubie, null)));

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.frontFace(gl.CCW);

  function render(cubies: readonly PhysicalCubie[], inFlight: InFlight | null, view: Mat4, projection: Mat4, eye: Vec, up: Vec): void {
    // Not pure white: D's own face color is pure white, and a background
    // leak inside the silhouette needs to be distinguishable from D by color
    // alone for the pixel-check scripts that read this back.
    gl.clearColor(0.85, 0.85, 0.85, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.uniformMatrix4fv(uProjection, false, [...projection]);
    gl.uniformMatrix4fv(uView, false, [...view]);
    gl.uniform3fv(uLightDir, cameraRelativeLightDir(eye, up));
    gl.uniform3fv(uCameraPos, eye);

    cubies.forEach((cubie, i) => {
      const model =
        inFlight !== null && inFlight.movingCubieIndices.has(i)
          ? animatedModelMatrix(cubie, inFlight.axis, inFlight.angleDeg)
          : bakedModelMatrix(cubie);
      gl.uniformMatrix4fv(uModel, false, [...model]);
      const { color, visible } = faceUniforms[i];
      gl.uniform3fv(uFaceColor, color);
      gl.uniform1fv(uFaceVisible, visible);
      gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    });

    gl.bindVertexArray(null);
  }

  function setMask(mask: Mask | null): void {
    faceUniforms = homeCubies.map((cubie, i) => (i === coreIndex ? coreFaceColorUniforms() : faceColorUniforms(cubie, mask)));
  }

  return { render, setMask };
}
