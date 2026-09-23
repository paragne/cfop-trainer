/**
 * GLSL ES 3.00 source for the one program every cubie draws with. The tile
 * look is entirely a fragment-shader distance-field over the face UV — see
 * cubie-mesh.ts for what those UVs mean. Face-color uniforms are indexed by
 * aFaceIndex, which cubie-mesh.ts guarantees lines up with
 * physical-cube.ts's ALL_AXES order, so gl-scene.ts can fill uColor0/uColor1
 * straight from a cubie's own `faces` array with no remapping.
 */
export const VERTEX_SHADER = `#version 300 es
uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;
in vec3 aPosition;
in vec2 aUV;
in float aFaceIndex;
out vec2 vUV;
flat out int vFaceIndex;
void main() {
  vUV = aUV;
  vFaceIndex = int(aFaceIndex + 0.5);
  gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
}
`;

// INSET/RADIUS/EDGE_PIXELS are visual constants, tuned by eye against the
// real renderer, not load-bearing for correctness. The rounded-tile distance
// field: negative inside the tile, positive in the dark margin that runs
// along every straight edge (INSET) and rounds off near corners (RADIUS).
// fwidth(dist) is the screen-space derivative of that field, so the
// tile/edge transition stays ~EDGE_PIXELS wide in screen pixels rather than
// shrinking to sub-pixel and aliasing when a face is seen at a steep angle.
export const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
in vec2 vUV;
flat in int vFaceIndex;
uniform vec3 uColor0[6];
uniform vec3 uColor1[6];
uniform float uSplit[6];
out vec4 fragColor;

const vec3 EDGE_COLOR = vec3(0.102, 0.102, 0.102);
const float INSET = 0.035;
const float RADIUS = 0.07;
const float EDGE_PIXELS = 0.75;

void main() {
  vec3 color0 = uColor0[vFaceIndex];
  vec3 color1 = uColor1[vFaceIndex];
  bool split = uSplit[vFaceIndex] > 0.5;
  vec3 base = split && (vUV.x + vUV.y >= 1.0) ? color1 : color0;

  vec2 p = vUV - 0.5;
  vec2 innerHalf = vec2(0.5 - INSET - RADIUS);
  vec2 q = abs(p) - innerHalf;
  float dist = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - RADIUS;
  float aa = max(fwidth(dist), 1e-6) * EDGE_PIXELS;
  float edge = smoothstep(-aa, aa, dist);

  fragColor = vec4(mix(base, EDGE_COLOR, edge), 1.0);
}
`;
