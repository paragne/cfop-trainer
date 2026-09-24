/**
 * Page wiring for the unlinked 3D dev page: mounts the WebGL view, builds the
 * preset buttons and the free-cam, pause and step controls. The app itself
 * reaches the same view through src/ui/play-panel.ts.
 */
import { ALL_CASES } from "../../data/algorithms.ts";
import type { Case } from "../../data/algorithms.ts";
import { parse } from "../../lib/notation.ts";
import { colorsAtCubies, cubiesFromColors, homeCubies } from "../../lib/physical-cube.ts";
import { setupCube } from "../../lib/case-state.ts";
import { homeCubiesWithCore, withCore } from "./core-cubie.ts";
import { createGlContext } from "./gl-context.ts";
import { createCubeView } from "./cube-view.ts";
import { attachZoom } from "./zoom.ts";
import { attachStepControls } from "./step-controls.ts";
import { installDebugHook } from "./debug-render-at.ts";
import { renderCase } from "../../lib/render.ts";

const PRESET_IDS = ["f2l-slot-3", "f2l-slot-4", "pll-h", "oll-24"] as const;

function caseById(id: string): Case {
  const found = ALL_CASES.find((c) => c.id === id);
  if (found === undefined) throw new Error(`Unknown case id: ${id}`);
  return found;
}

function required<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (el === null) throw new Error(`three-d.html is missing ${selector}`);
  return el;
}

const stage = required<HTMLElement>("#stage");
const info = required<HTMLElement>("#info");
const presets = required<HTMLElement>("#presets");
const speedInput = required<HTMLInputElement>("#speed");
const radiusInput = required<HTMLInputElement>("#radius");
const freecamInput = required<HTMLInputElement>("#freecam");
const pauseButton = required<HTMLButtonElement>("#pause");
const canvas = required<HTMLCanvasElement>("#canvas");
const stepModeInput = required<HTMLInputElement>("#stepmode");
const stepPrevButton = required<HTMLButtonElement>("#step-prev");
const stepNextButton = required<HTMLButtonElement>("#step-next");
const algContainer = required<HTMLElement>("#alg");

const glContext = createGlContext(canvas);
if (glContext === null) {
  const state = colorsAtCubies(homeCubies());
  stage.innerHTML = renderCase(state, "top");
  info.textContent = "WebGL2 is unavailable in this browser; showing a static picture.";
} else {
  const { onContextLost, onContextRestored } = glContext;
  const view = createCubeView(canvas, glContext, () => Number(speedInput.value));
  const { camera, player } = view;
  const stepControls = attachStepControls(
    { stepModeInput, prevButton: stepPrevButton, nextButton: stepNextButton, algContainer },
    player,
  );

  onContextLost(() => {
    info.textContent = "WebGL context lost.";
  });
  onContextRestored(() => {
    info.textContent = "";
  });

  camera.setRadius(Number(radiusInput.value));
  camera.attachDrag(stage);
  attachZoom(canvas, radiusInput, camera);

  let paused = false;

  function syncCameraMode(): void {
    camera.setMode(freecamInput.checked ? "free" : "locked");
  }

  function resetPlayback(): void {
    paused = false;
    pauseButton.textContent = "Pause";
  }

  async function loadCase(c: Case): Promise<void> {
    resetPlayback();
    syncCameraMode();
    const solutionMoves = parse(c.algs[0].moves);
    // From case-state.ts's setupCube(), not a physical replay of the inverse
    // solution (see cubiesFromColors).
    view.showCase(c.mask, withCore(cubiesFromColors(setupCube(c))));
    info.textContent = `${c.id} — ${c.algs[0].display}`;
    stepControls.loadCase(solutionMoves);
    if (!stepControls.isStepMode()) await player.play(solutionMoves);
  }

  function loadSolved(): void {
    resetPlayback();
    syncCameraMode();
    view.showCase(null, homeCubiesWithCore());
    info.textContent = "Solved";
    stepControls.loadCase([]);
  }

  const solvedButton = document.createElement("button");
  solvedButton.type = "button";
  solvedButton.textContent = "Solved";
  solvedButton.addEventListener("click", loadSolved);
  presets.append(solvedButton);

  for (const id of PRESET_IDS) {
    const c = caseById(id);
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = id;
    button.addEventListener("click", () => void loadCase(c));
    presets.append(button);
  }

  radiusInput.addEventListener("input", () => camera.setRadius(Number(radiusInput.value)));
  freecamInput.addEventListener("change", syncCameraMode);
  pauseButton.addEventListener("click", () => {
    paused = !paused;
    pauseButton.textContent = paused ? "Resume" : "Pause";
    if (paused) player.pause();
    else player.resume();
  });

  loadSolved();
  installDebugHook(camera, view.setMask, (cubies) => player.snapTo(cubies), view.renderNow);
}
