/**
 * The render-on-demand loop shared by the app's 3D panel and the dev page:
 * scene, camera and player wired together, redrawing only when a camera
 * change, a resize or an in-flight move asks for it. At rest no rAF callback
 * fires at all.
 */
import type { Mask } from "../../data/algorithms.ts";
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
  dispose(): void;
};

export function createCubeView(canvas: HTMLCanvasElement, glContext: GlContext, speed: () => number): CubeView {
  const { gl, resize, onContextRestored } = glContext;
  const initialCubies = homeCubiesWithCore();
  let glScene = createGlScene(gl, initialCubies, initialCubies.length - 1);
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
    glScene.render(cubies, inFlight, view, perspective(FOV_Y_RADIANS, aspect, near, far), camera.getEye(), camera.getUp());
  }

  onContextRestored(() => {
    // The lost context took its program, buffers and VAO with it.
    glScene = createGlScene(gl, initialCubies, initialCubies.length - 1);
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
    renderNow,
    dispose() {
      player.pause();
      if (frame !== null) cancelAnimationFrame(frame);
      observer.disconnect();
    },
  };
}
