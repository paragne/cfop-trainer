/**
 * Column-major 4x4 matrices, the layout WebGL's uniformMatrix4fv expects
 * (and the same layout css-transform.ts's now-deleted matrix3d() used, so a
 * matrix built here means the same thing that one did). `rotationAboutAxis`
 * independently re-derives the Rodrigues formula rather than importing
 * rotate-by-angle.ts's rotateByAngle, matching visual-angle.test.ts's own
 * precedent of not testing a function against a copy of itself; the two are
 * cross-checked against each other and against cube.ts's rotate() in tests.
 */
import type { Vec } from "./cube.ts";

export type Mat4 = readonly number[];

const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const cross = (a: Vec, b: Vec): Vec => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

const scale = (v: Vec, k: number): Vec => [v[0] * k, v[1] * k, v[2] * k];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const normalize = (v: Vec): Vec => scale(v, 1 / Math.sqrt(dot(v, v)));

export function identity(): Mat4 {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

// a * b: applying the result to a point applies b first, then a.
export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

// Places three orthonormal (or not — callers rely on orthonormal columns for
// rigid transforms, but this itself doesn't require it) basis columns and a
// translation. The generic replacement for css-transform.ts's matrix3d(),
// minus the pixel-scale parameter: everything downstream works in cube.ts's
// own units now, with scale to pixels handled once by the projection matrix.
export function fromColumns(colX: Vec, colY: Vec, colZ: Vec, translation: Vec): Mat4 {
  return [
    colX[0], colX[1], colX[2], 0,
    colY[0], colY[1], colY[2], 0,
    colZ[0], colZ[1], colZ[2], 0,
    translation[0], translation[1], translation[2], 1,
  ];
}

// Clockwise as seen from the tip of axis, matching cube.ts's rotate() and
// rotate-by-angle.ts's rotateByAngle at every angle, not just 90°.
export function rotationAboutAxis(axis: Vec, degrees: number): Mat4 {
  const len = Math.sqrt(dot(axis, axis));
  const a: Vec = [axis[0] / len, axis[1] / len, axis[2] / len];
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const rotate = (v: Vec): Vec => {
    const d = dot(a, v);
    const c = cross(a, v);
    return [
      v[0] * cos - c[0] * sin + a[0] * d * (1 - cos),
      v[1] * cos - c[1] * sin + a[1] * d * (1 - cos),
      v[2] * cos - c[2] * sin + a[2] * d * (1 - cos),
    ];
  };
  return fromColumns(rotate([1, 0, 0]), rotate([0, 1, 0]), rotate([0, 0, 1]), [0, 0, 0]);
}

// Standard right-handed OpenGL/WebGL projection: camera looks down -Z in
// view space, clip-space Z spans [-1, 1]. fovYRadians is the full vertical
// field of view.
export function perspective(fovYRadians: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovYRadians / 2);
  return [
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0,
  ];
}

// Standard right-handed lookAt: `back` points from center toward eye (the
// same sense camera-projection.ts's screenAxes and camera.ts's `back` use),
// `right` and `trueUp` complete a positive-Y-up, positive-X-right frame —
// unlike css-transform.ts's viewMatrix3d, which negated up because CSS
// screen-y grows downward. WebGL clip space grows up, so this does not.
export function lookAt(eye: Vec, center: Vec, up: Vec): Mat4 {
  const back = normalize(sub(eye, center));
  const right = normalize(cross(up, back));
  const trueUp = cross(back, right);
  return [
    right[0], trueUp[0], back[0], 0,
    right[1], trueUp[1], back[1], 0,
    right[2], trueUp[2], back[2], 0,
    -dot(right, eye), -dot(trueUp, eye), -dot(back, eye), 1,
  ];
}

// For tests and CPU-side geometry checks, not the render path (the GPU
// applies matrices to vertices itself). Divides by w, so this also resolves
// a perspective projection, not just an affine transform.
export function transformPoint(m: Mat4, v: Vec): Vec {
  const x = m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12];
  const y = m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13];
  const z = m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14];
  const w = m[3] * v[0] + m[7] * v[1] + m[11] * v[2] + m[15];
  if (Math.abs(w) < 1e-12) throw new Error("transformPoint: w is zero, matrix is degenerate for this point");
  return [x / w, y / w, z / w];
}
