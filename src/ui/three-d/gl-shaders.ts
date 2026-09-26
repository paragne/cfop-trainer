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
import { LOGO_HALF, STICKER_INSET, STICKER_MIN_RADIUS } from "../../lib/aesthetic.ts";
import { BEVEL_RADIUS } from "./cubie-mesh.ts";
import { CURVE_RADIUS } from "./piece-mesh.ts";

export const VERTEX_SHADER = `#version 300 es
uniform mat4 uProjection;
uniform mat4 uView;
uniform mat4 uModel;
in vec3 aPosition;
in vec3 aNormal;
out vec3 vLocalPosition;
out vec3 vLocalNormal;
out vec3 vWorldNormal;
out vec3 vWorldPosition;
void main() {
  vLocalPosition = aPosition;
  vLocalNormal = aNormal;
  vWorldNormal = mat3(uModel) * aNormal;
  vec4 worldPos = uModel * vec4(aPosition, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = uProjection * uView * worldPos;
}
`;

export const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
in vec3 vLocalPosition;
in vec3 vLocalNormal;
in vec3 vWorldNormal;
in vec3 vWorldPosition;
uniform vec3 uFaceColor[6];
uniform float uFaceVisible[6];
uniform vec3 uLightDir;
uniform vec3 uCameraPos;
uniform float uBlackInternals;
uniform float uStickered;
uniform vec3 uBody;
uniform vec3 uHome;
uniform sampler2D uLogo;
uniform int uLogoFace;
uniform vec3 uLogoColumn;
uniform vec3 uLogoRow;
out vec4 fragColor;

const vec3 AXES[6] = vec3[6](
  vec3(1.0, 0.0, 0.0), vec3(-1.0, 0.0, 0.0),
  vec3(0.0, 1.0, 0.0), vec3(0.0, -1.0, 0.0),
  vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, -1.0)
);

const float STICKER_INSET = ${STICKER_INSET.toFixed(3)};
const float STICKER_MIN_RADIUS = ${STICKER_MIN_RADIUS.toFixed(3)};
const float CURVE_RADIUS = ${CURVE_RADIUS.toFixed(3)};
const float BEVEL_RADIUS = ${BEVEL_RADIUS.toFixed(3)};
const float LOGO_HALF = ${LOGO_HALF.toFixed(3)};
const float STICKER_MATTE = 0.7;
const float AMBIENT = 0.6;
const float DIFFUSE = 0.4;
const float SPECULAR = 0.2;
const float SHININESS = 28.0;

// Signed distance to the sticker's outline on face axis k, negative inside; the
// TS twin is stickerDistance in face-color.ts.
float stickerDistance(vec3 inPlane, int k) {
  int a = (k + 1) % 3;
  int b = (k + 2) % 3;
  float sa = inPlane[a] < 0.0 ? -1.0 : 1.0;
  float sb = inPlane[b] < 0.0 ? -1.0 : 1.0;
  bool inward = uHome[a] != sa && uHome[b] != sb;
  float r = max((inward ? CURVE_RADIUS : BEVEL_RADIUS) - STICKER_INSET, STICKER_MIN_RADIUS);
  vec2 d = abs(vec2(inPlane[a], inPlane[b])) - (0.5 - STICKER_INSET - r);
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

void main() {
  // The face a point belongs to is the axis its surface faces, not the one it
  // is farthest along: the normal is smooth across the curved corners, so the
  // boundary between faces is too, where position would step along triangles.
  float best = -1.0;
  vec3 base = vec3(0.0);
  float sticker = 0.0;
  int face = 0;
  for (int k = 0; k < 6; k++) {
    float score = dot(vLocalNormal, AXES[k]);
    if (score > best) {
      best = score;
      face = k;
    }
  }
  vec3 axis = AXES[face];
  vec3 inPlane = vLocalPosition - axis * dot(vLocalPosition, axis);

  if (uBlackInternals < 0.5) {
    // Split internals: a hidden face borrows the nearest sticker's color.
    float nearest = -1.0;
    for (int k = 0; k < 6; k++) {
      if (uFaceVisible[k] > 0.5) {
        float score = dot(vLocalPosition, AXES[k]);
        if (score > nearest) {
          nearest = score;
          base = uFaceColor[k];
        }
      }
    }
  } else {
    // Black internals: only the face the point is on can show color, and a
    // stickered cube only inside the sticker outline, softened over one pixel.
    float on = uFaceVisible[face];
    if (uStickered > 0.5) {
      float d = stickerDistance(inPlane, face / 2);
      float w = fwidth(d);
      on *= 1.0 - smoothstep(-w, w, d);
      sticker = on;
    }
    base = mix(uBody, uFaceColor[face], on);
  }

  // The logo lives on one cubie's one flat face, so it cannot reach another
  // face or an internal.
  if (face == uLogoFace) {
    vec2 uv = vec2(dot(inPlane, uLogoColumn), -dot(inPlane, uLogoRow)) / (2.0 * LOGO_HALF) + 0.5;
    if (all(greaterThanEqual(uv, vec2(0.0))) && all(lessThanEqual(uv, vec2(1.0)))) {
      vec4 mark = texture(uLogo, uv);
      base = mix(base, mark.rgb, mark.a);
    }
  }

  vec3 N = normalize(vWorldNormal);
  vec3 L = normalize(uLightDir);
  vec3 V = normalize(uCameraPos - vWorldPosition);
  vec3 H = normalize(L + V);
  float diff = max(dot(N, L), 0.0);
  float spec = pow(max(dot(N, H), 0.0), SHININESS);
  // A sticker is matte film on glossy plastic, so it takes less of the highlight.
  vec3 lit = base * (AMBIENT + DIFFUSE * diff) + vec3(SPECULAR * spec * (1.0 - STICKER_MATTE * sticker));
  fragColor = vec4(lit, 1.0);
}
`;
