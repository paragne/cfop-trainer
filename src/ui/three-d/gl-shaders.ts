/**
 * GLSL ES 3.00 source for the one program every cubie (and the core, see
 * gl-scene.ts) draws with.
 *
 * Coloring: a fragment picks the color of the nearest of its cubie's visible
 * (sticker) faces, measured in local (unrotated, object) space — this is a
 * hand-verified port of face-color.ts's nearestVisibleFace, kept as GLSL
 * rather than shared with it (a shader can't import TS) the same way
 * mat4.ts's rotationAboutAxis re-derives Rodrigues' formula independently of
 * rotate-by-angle.ts's cross-checked twin. AXES must match ALL_AXES's order
 * (see physical-cube.ts) so uFaceColor/uFaceVisible line up with a cubie's
 * own `faces` array with no remapping.
 *
 * Lighting: Lambert diffuse plus high ambient plus a small Blinn-Phong
 * specular highlight, against a light fixed relative to the camera (see
 * gl-scene.ts) so no face goes dark while orbiting. No painted edge lines —
 * cubie-mesh.ts's bevels catch the shading themselves.
 */
export const VERTEX_SHADER = `#version 300 es
uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;
in vec3 aPosition;
in vec3 aNormal;
out vec3 vLocalPosition;
out vec3 vWorldNormal;
out vec3 vWorldPosition;
void main() {
  vLocalPosition = aPosition;
  vWorldNormal = mat3(uModel) * aNormal;
  vec4 worldPos = uModel * vec4(aPosition, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = uProjection * uView * worldPos;
}
`;

export const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
in vec3 vLocalPosition;
in vec3 vWorldNormal;
in vec3 vWorldPosition;
uniform vec3 uFaceColor[6];
uniform float uFaceVisible[6];
uniform vec3 uLightDir;
uniform vec3 uCameraPos;
out vec4 fragColor;

const vec3 AXES[6] = vec3[6](
  vec3(1.0, 0.0, 0.0), vec3(-1.0, 0.0, 0.0),
  vec3(0.0, 1.0, 0.0), vec3(0.0, -1.0, 0.0),
  vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, -1.0)
);

const float AMBIENT = 0.6;
const float DIFFUSE = 0.4;
const float SPECULAR = 0.2;
const float SHININESS = 28.0;

void main() {
  float best = -1.0;
  vec3 base = vec3(0.0);
  for (int k = 0; k < 6; k++) {
    if (uFaceVisible[k] > 0.5) {
      float score = dot(vLocalPosition, AXES[k]);
      if (score > best) {
        best = score;
        base = uFaceColor[k];
      }
    }
  }

  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(uLightDir);
  vec3 V = normalize(uCameraPos - vWorldPosition);
  vec3 H = normalize(L + V);
  float diff = max(dot(N, L), 0.0);
  float spec = pow(max(dot(N, H), 0.0), SHININESS);
  vec3 lit = base * (AMBIENT + DIFFUSE * diff) + vec3(SPECULAR * spec);
  fragColor = vec4(lit, 1.0);
}
`;
