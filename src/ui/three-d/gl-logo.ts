import logoMark from "../../assets/logo-mark.svg";

const TEXTURE_SIZE = 256;

// The app's mark as a texture on unit 0. It starts as one transparent texel, so
// the shader can always sample it, and is swapped for the rasterized mark once
// the SVG has loaded; `onReady` asks for a redraw then, since nothing else
// redraws a cube at rest.
export function createLogoTexture(gl: WebGL2RenderingContext, onReady: () => void): void {
  const texture = gl.createTexture();
  if (texture === null) throw new Error("createTexture failed");
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));

  const image = new Image();
  image.addEventListener("load", () => {
    const canvas = document.createElement("canvas");
    canvas.width = TEXTURE_SIZE;
    canvas.height = TEXTURE_SIZE;
    const context = canvas.getContext("2d");
    if (context === null) throw new Error("2d context unavailable");
    context.drawImage(image, 0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    onReady();
  });
  image.src = logoMark;
}
