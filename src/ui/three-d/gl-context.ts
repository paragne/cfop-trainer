/**
 * Canvas-level WebGL2 concerns: acquiring the context, sizing the drawing
 * buffer for devicePixelRatio, and context-lost/restored. Everything that
 * actually draws lives in gl-scene.ts; a lost context means gl-scene's
 * program/buffers are gone too, so main.ts must rebuild the scene on
 * restore, not just resume drawing.
 */
export type GlContext = {
  readonly gl: WebGL2RenderingContext;
  // Resizes the drawing buffer to match the canvas's current CSS size at the
  // device's pixel ratio. Returns whether the size actually changed, so a
  // caller only redraws when it needs to.
  resize(): boolean;
  onContextLost(callback: () => void): void;
  onContextRestored(callback: () => void): void;
};

export function createGlContext(canvas: HTMLCanvasElement): GlContext | null {
  // preserveDrawingBuffer: without it, a render-on-demand canvas (nothing
  // redraws every frame) is free to clear its own backbuffer between frames
  // once the browser considers the last drawn one "presented" — readPixels
  // then sees whatever the browser cleared it to, not the last real draw.
  const context = canvas.getContext("webgl2", { antialias: true, preserveDrawingBuffer: true });
  if (context === null) return null;
  const gl: WebGL2RenderingContext = context;

  function resize(): boolean {
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width === width && canvas.height === height) return false;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    return true;
  }

  return {
    gl,
    resize,
    onContextLost(callback) {
      canvas.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        callback();
      });
    },
    onContextRestored(callback) {
      canvas.addEventListener("webglcontextrestored", () => callback());
    },
  };
}
