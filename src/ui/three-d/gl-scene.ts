/**
 * Compiles the one shader program, builds the one shared cubie mesh, and
 * draws all 26 cubies each frame with per-cubie uModel/color uniforms.
 * Every internal cube boundary has two coincident, oppositely-facing
 * triangles (this cubie's face against its neighbour's, flush at rest and
 * mid-turn alike); back-face culling plus the mesh's consistent
 * CCW-from-outside winding (see cubie-mesh.test.ts) is what keeps exactly
 * one of that coincident pair visible per view direction, instead of the
 * two z-fighting in the depth buffer.
 */
import { unitCubeVertices } from "./cubie-mesh.ts";
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./gl-shaders.ts";
import { FILL, toRgb } from "./palette.ts";
import { animatedModelMatrix, bakedModelMatrix } from "./cubie-model.ts";
import type { InFlight } from "./player.ts";
import type { Mat4 } from "../../lib/mat4.ts";
import type { PhysicalCubie } from "../../lib/physical-cube.ts";

export type GlScene = {
  render(cubies: readonly PhysicalCubie[], inFlight: InFlight | null, view: Mat4, projection: Mat4): void;
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

const FLOATS_PER_VERTEX = 6; // position(3) + uv(2) + faceIndex(1)

function buildVertexArray(gl: WebGL2RenderingContext, program: WebGLProgram): number {
  const vertices = unitCubeVertices();
  const data = new Float32Array(vertices.length * FLOATS_PER_VERTEX);
  vertices.forEach((v, i) => data.set([...v.position, ...v.uv, v.faceIndex], i * FLOATS_PER_VERTEX));
  const buffer = gl.createBuffer();
  if (buffer === null) throw new Error("createBuffer failed");
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  const stride = FLOATS_PER_VERTEX * 4;
  const aPosition = requireAttrib(gl, program, "aPosition");
  const aUV = requireAttrib(gl, program, "aUV");
  const aFaceIndex = requireAttrib(gl, program, "aFaceIndex");
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(aUV);
  gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, stride, 3 * 4);
  gl.enableVertexAttribArray(aFaceIndex);
  gl.vertexAttribPointer(aFaceIndex, 1, gl.FLOAT, false, stride, 5 * 4);
  return vertices.length;
}

// Colors never change for a given cubie/face-slot (see physical-cube.ts), so
// this bakes uniforms once from `home`, never from the live evolving cubies.
function faceColorUniforms(home: PhysicalCubie): { color0: Float32Array; color1: Float32Array; split: Float32Array } {
  const color0 = new Float32Array(18);
  const color1 = new Float32Array(18);
  const split = new Float32Array(6);
  home.faces.forEach((face, i) => {
    color0.set(toRgb(FILL[face.colors[0]]), i * 3);
    color1.set(toRgb(FILL[face.colors.length === 2 ? face.colors[1] : face.colors[0]]), i * 3);
    split[i] = face.colors.length === 2 ? 1 : 0;
  });
  return { color0, color1, split };
}

export function createGlScene(gl: WebGL2RenderingContext, homeCubies: readonly PhysicalCubie[]): GlScene {
  const program = link(gl);
  const vao = gl.createVertexArray();
  if (vao === null) throw new Error("createVertexArray failed");
  gl.bindVertexArray(vao);
  const vertexCount = buildVertexArray(gl, program);
  gl.bindVertexArray(null);

  const uProjection = requireUniform(gl, program, "uProjection");
  const uView = requireUniform(gl, program, "uView");
  const uModel = requireUniform(gl, program, "uModel");
  const uColor0 = requireUniform(gl, program, "uColor0");
  const uColor1 = requireUniform(gl, program, "uColor1");
  const uSplit = requireUniform(gl, program, "uSplit");
  const colorUniforms = homeCubies.map(faceColorUniforms);

  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.frontFace(gl.CCW);

  function render(cubies: readonly PhysicalCubie[], inFlight: InFlight | null, view: Mat4, projection: Mat4): void {
    // Not pure white: D's own face color is pure white, and a background
    // leak inside the silhouette needs to be distinguishable from D by color
    // alone for the pixel-check scripts that read this back.
    gl.clearColor(0.85, 0.85, 0.85, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.uniformMatrix4fv(uProjection, false, [...projection]);
    gl.uniformMatrix4fv(uView, false, [...view]);

    cubies.forEach((cubie, i) => {
      const model =
        inFlight !== null && inFlight.movingCubieIndices.has(i)
          ? animatedModelMatrix(cubie, inFlight.axis, inFlight.angleDeg)
          : bakedModelMatrix(cubie);
      gl.uniformMatrix4fv(uModel, false, [...model]);
      const { color0, color1, split } = colorUniforms[i];
      gl.uniform3fv(uColor0, color0);
      gl.uniform3fv(uColor1, color1);
      gl.uniform1fv(uSplit, split);
      gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    });

    gl.bindVertexArray(null);
  }

  return { render };
}
