import type { Case } from "../../data/algorithms.ts";
import { caseMask } from "../../lib/case-state.ts";
import { toRgb } from "../../lib/palette.ts";
import { colorsAtCubies } from "../../lib/physical-cube.ts";
import { viewFaces } from "../../lib/view-faces.ts";
import type { ViewFaces } from "../../lib/view-faces.ts";
import { ZOOM_RANGE } from "../../lib/prefs.ts";
import { createCubeView } from "./cube-view.ts";
import type { CubeView } from "./cube-view.ts";
import { createGlContext } from "./gl-context.ts";
import type { GlContext } from "./gl-context.ts";
import { speedToDurationMs } from "./player.ts";
import { createStepMode } from "./step-mode.ts";
import type { StepMode } from "./step-mode.ts";
import { attachZoom } from "./zoom.ts";

export type PanelSession = {
  gl: GlContext;
  view: CubeView;
  stepper: StepMode;
  // What is loaded, so a render that changes nothing does not restart playback.
  loaded: string;
  // Whose case it is, so a new one starts from the locked view again.
  caseKey: string;
};

type Options = {
  stage: HTMLElement;
  speed: () => number;
  zoom: () => number;
  onZoom: (zoom: number) => void;
  onSettled: () => void;
  onProgress: (boundary: number) => void;
};

// style.css's --bg: the 3D view sits in the page's own black.
const VOID = toRgb("#0b0b0c");

// The GPU context, the cube on it and the stepper that drives it, in a canvas
// put on the stage. Null where WebGL 2 is not there to give.
export function startPanelSession({ stage, speed, zoom, onZoom, onSettled, onProgress }: Options): PanelSession | null {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", "Cube in 3D");
  stage.replaceChildren(canvas);
  const gl = createGlContext(canvas);
  if (gl === null) {
    canvas.remove();
    return null;
  }
  const view = createCubeView(canvas, gl, speed, VOID);
  view.setFit(true);
  view.camera.attachDrag(stage);
  attachZoom(canvas, (farther) => onZoom(Math.min(ZOOM_RANGE.max, Math.max(ZOOM_RANGE.min, zoom() / farther))));
  const stepper = createStepMode(view.player, { onSettled, onProgress, durationMs: () => speedToDurationMs(speed()) });
  return { gl, view, stepper, loaded: "", caseKey: "" };
}

// F2L only: the other views have no F, U, R reading to keep up with. The
// letters come from where the centers are now, so an x, y or z in the
// algorithm turns them while the camera follows.
export function legendFaces({ view }: PanelSession, c: Case): ViewFaces | null {
  const mask = caseMask(c);
  if (mask.kind !== "f2l" || view.camera.getMode() !== "locked") return null;
  return viewFaces(colorsAtCubies(view.player.currentFrame().cubies), mask.slot);
}
