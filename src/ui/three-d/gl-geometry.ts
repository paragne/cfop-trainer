import { unitCubeVertices } from "./cubie-mesh.ts";
import { requireAttrib } from "./gl-program.ts";
import { pieceVertices } from "./piece-mesh.ts";
import type { PhysicalCubie } from "../../lib/physical-cube.ts";

const FLOATS_PER_VERTEX = 6; // position(3) + normal(3)

export type Geometry = { vao: WebGLVertexArrayObject; ranges: { first: number; count: number }[] };

// Every piece has its own shape (see piece-mesh.ts), so a buffer holds them end
// to end, and `ranges` says where each cubie's begins. The core, hidden in the
// middle, is the plain rounded box.
export function buildGeometry(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  homeCubies: readonly PhysicalCubie[],
  coreIndex: number,
): Geometry {
  const vao = gl.createVertexArray();
  if (vao === null) throw new Error("createVertexArray failed");
  gl.bindVertexArray(vao);
  const meshes = homeCubies.map((cubie, i) => (i === coreIndex ? unitCubeVertices() : pieceVertices(cubie.position)));
  const data = new Float32Array(meshes.reduce((sum, m) => sum + m.length, 0) * FLOATS_PER_VERTEX);
  let vertex = 0;
  const ranges = meshes.map((mesh) => {
    const first = vertex;
    for (const { position, normal } of mesh) {
      const at = vertex++ * FLOATS_PER_VERTEX;
      data[at] = position[0];
      data[at + 1] = position[1];
      data[at + 2] = position[2];
      data[at + 3] = normal[0];
      data[at + 4] = normal[1];
      data[at + 5] = normal[2];
    }
    return { first, count: mesh.length };
  });
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
  gl.bindVertexArray(null);
  return { vao, ranges };
}
