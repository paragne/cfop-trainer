/**
 * Shader compilation and lookup for gl-scene.ts: a failure here is a
 * programmer error (a shader that does not build, a name the shader lost), so
 * each throws instead of returning a value to check.
 */
import { FRAGMENT_SHADER, VERTEX_SHADER } from "./gl-shaders.ts";

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

export function link(gl: WebGL2RenderingContext): WebGLProgram {
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

export function requireAttrib(gl: WebGL2RenderingContext, program: WebGLProgram, name: string): number {
  const loc = gl.getAttribLocation(program, name);
  if (loc === -1) throw new Error(`missing attribute ${name}`);
  return loc;
}

export function requireUniform(gl: WebGL2RenderingContext, program: WebGLProgram, name: string): WebGLUniformLocation {
  const loc = gl.getUniformLocation(program, name);
  if (loc === null) throw new Error(`missing uniform ${name}`);
  return loc;
}
