/**
 * The render-on-demand loop shared by the app's 3D panel and the dev page:
 * scene, camera and player wired together, redrawing only when a camera
 * change, a resize or an in-flight move asks for it. At rest no rAF callback
 * fires at all.
 */
import type { Mask } from "../../data/algorithms.ts";
import { blendFit, fitMatrix, lockedFit, sphereFit } from "../../lib/fit.ts";
import type { Fit } from "../../lib/fit.ts";
import { multiply } from "../../lib/mat4.ts";
import { lookAt, perspective } from "../../lib/mat4.ts";
import type { Mat4 } from "../../lib/mat4.ts";
import type { PhysicalCubie } from "../../lib/physical-cube.ts";
import { createCamera } from "./camera.ts";
import type { Camera } from "./camera.ts";
import { applyCorrectiveForCubies, applyEyeForCase } from "./case-camera.ts";
import { homeCubiesWithCore } from "./core-cubie.ts";
import type { GlContext } from "./gl-context.ts";
import { createGlScene } from "./gl-scene.ts";
import { createPlayer, speedToDurationMs } from "./player.ts";
import type { InFlight, Player } from "./player.ts";

const FOV_Y_RADIANS = (35 * Math.PI) / 180;
// Breathing room left around the cube when it is fitted to its canvas.
const FIT_MARGIN = 0.03;
// How much of the way to a new fit each frame goes.
const FIT_EASE = 0.3;
const NEAR_FAR_MARGIN = 3; // cube's bounding sphere is ~2.6 units; a bit more keeps both planes tight but safe

export type CubeView = {
  readonly camera: Camera;
  readonly player: Player;
  // Frames the case: its default eye, the mask baked from these same cubies
  // (this case's setup defines which piece is "the target corner"), and the
  // player snapped to them. The first camera correction after it lands
  // instantly instead of tweening from the previous case's view.
  showCase(mask: Mask | null, cubies: readonly PhysicalCubie[]): void;
  setMask(mask: Mask | null, home: readonly PhysicalCubie[]): void;
  renderNow(cubies: readonly PhysicalCubie[], inFlight: InFlight | null): void;
  // Centers the cube in its canvas and scales it to fill it, times `zoom`.
  // Off, the camera's radius alone sets the size and the cube is not centered.
  setFit(on: boolean): void;
  setZoom(zoom: number): void;
  dispose(): void;
};

export function createCubeView(
  canvas: HTMLCanvasElement,
  glContext: GlContext,
  speed: () => number,
  background: readonly [number, number, number],
): CubeView {
  const { gl, resize, onContextRestored } = glContext;
  const initialCubies = homeCubiesWithCore();
  let glScene = createGlScene(gl, initialCubies, initialCubies.length - 1, background);
  let fit = false;
  let zoom = 1;
  // What is applied now, chasing what the view calls for, so a change of
  // fit (entering an orbit, a zoom) eases in instead of jumping.
  let applied: Fit | null = null;
  let mask: Mask | null = null;
  let home: readonly PhysicalCubie[] = initialCubies;

  let frame: number | null = null;
  // The camera correction is a pure function of the cubies at rest,
  // recomputed only when they change (see case-camera.ts).
  let lastCorrected: readonly PhysicalCubie[] | null = null;
  let snapNextCorrection = true;
  function requestRedraw(): void {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      const { cubies, inFlight } = player.currentFrame();
      if (inFlight === null && cubies !== lastCorrected) {
        lastCorrected = cubies;
        applyCorrectiveForCubies(camera, cubies, snapNextCorrection);
        snapNextCorrection = false;
      }
      renderNow(cubies, inFlight);
    });
  }

  const camera = createCamera(requestRedraw);
  const player = createPlayer(() => speedToDurationMs(speed()), requestRedraw);

  function renderNow(cubies: readonly PhysicalCubie[], inFlight: InFlight | null): void {
    resize();
    const aspect = canvas.width / Math.max(1, canvas.height);
    const radius = camera.getRadius();
    const near = Math.max(0.1, radius - NEAR_FAR_MARGIN);
    const far = radius + NEAR_FAR_MARGIN;
    const view: Mat4 = lookAt(camera.getEye(), camera.getTarget(), camera.getUp());
    const projection = perspective(FOV_Y_RADIANS, aspect, near, far);
    const from = applied;
    let shown = projection;
    if (fit) {
      // An orbit keeps one size; the locked view fits the case tightly.
      const wanted =
        camera.getMode() === "free"
          ? sphereFit(radius, FOV_Y_RADIANS, aspect, FIT_MARGIN, zoom)
          : lockedFit(multiply(projection, view), FIT_MARGIN, zoom);
      applied = from === null ? wanted : blendFit(from, wanted, FIT_EASE);
      if (Math.abs(applied.scale - wanted.scale) > 1e-3 || Math.abs(applied.dx - wanted.dx) > 1e-3 || Math.abs(applied.dy - wanted.dy) > 1e-3) requestRedraw();
      shown = multiply(fitMatrix(applied), projection);
    }
    glScene.render(cubies, inFlight, view, shown, camera.getEye(), camera.getUp());
  }

  onContextRestored(() => {
    // The lost context took its program, buffers and VAO with it.
    glScene = createGlScene(gl, initialCubies, initialCubies.length - 1, background);
    glScene.setMask(mask, home);
    requestRedraw();
  });

  const observer = new ResizeObserver(requestRedraw);
  observer.observe(canvas);
  player.snapTo(initialCubies);

  function setMask(next: Mask | null, cubies: readonly PhysicalCubie[]): void {
    mask = next;
    home = cubies;
    glScene.setMask(next, cubies);
  }

  return {
    camera,
    player,
    showCase(next, cubies) {
      applyEyeForCase(camera, next);
      setMask(next, cubies);
      snapNextCorrection = true;
      player.snapTo(cubies);
    },
    setMask,
    setFit(on) {
      fit = on;
      requestRedraw();
    },
    setZoom(next) {
      zoom = next;
      requestRedraw();
    },
    renderNow,
    dispose() {
      player.pause();
      if (frame !== null) cancelAnimationFrame(frame);
      observer.disconnect();
    },
  };
}
