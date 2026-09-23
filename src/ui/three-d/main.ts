/**
 * Page wiring for the unlinked 3D prototype: mounts the WebGL scene and
 * camera, builds the preset buttons and controls. No mode integration — this
 * reads cases from ALL_CASES to animate their solutions, nothing else.
 *
 * Render-on-demand: nothing here runs a continuous per-frame loop. A redraw
 * is only ever scheduled by a camera change, a resize, or the player ticking
 * an in-flight move; at rest, no rAF callback fires at all.
 */
import { ALL_CASES } from "../../data/algorithms.ts";
import type { Case } from "../../data/algorithms.ts";
import { applyMoves, SOLVED } from "../../lib/cube.ts";
import { invert, parse } from "../../lib/notation.ts";
import { applyAlgToCubies, colorsAtCubies, homeCubies } from "../../lib/physical-cube.ts";
import type { PhysicalCubie } from "../../lib/physical-cube.ts";
import { homeCubiesWithCore } from "./core-cubie.ts";
import { homeRotation } from "../../lib/orientation.ts";
import { lookAt, perspective } from "../../lib/mat4.ts";
import type { Mat4 } from "../../lib/mat4.ts";
import { createGlContext } from "./gl-context.ts";
import { createGlScene } from "./gl-scene.ts";
import { createPlayer, speedToDurationMs } from "./player.ts";
import type { InFlight, Player } from "./player.ts";
import { createCamera } from "./camera.ts";
import { attachZoom } from "./zoom.ts";
import { attachStepControls } from "./step-controls.ts";
import { renderAt } from "./debug-render-at.ts";
import { renderCase } from "../../lib/render.ts";

const FOV_Y_RADIANS = (35 * Math.PI) / 180;
const NEAR_FAR_MARGIN = 3; // cube's bounding sphere is ~2.6 units; a bit more keeps both planes tight but safe

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
  const { gl, resize, onContextLost, onContextRestored } = glContext;
  const initialCubies = homeCubiesWithCore();
  let glScene = createGlScene(gl, initialCubies, initialCubies.length - 1);

  let scheduled = false;
  function requestRedraw(): void {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const { cubies, inFlight } = player.currentFrame();
      renderNow(cubies, inFlight);
    });
  }

  const camera = createCamera(requestRedraw);
  const player: Player = createPlayer(() => speedToDurationMs(Number(speedInput.value)), requestRedraw);
  const stepControls = attachStepControls(
    { stepModeInput, prevButton: stepPrevButton, nextButton: stepNextButton, algContainer },
    player,
  );

  function viewProjection(): { view: Mat4; projection: Mat4 } {
    const aspect = canvas.width / Math.max(1, canvas.height);
    const radius = camera.getRadius();
    const near = Math.max(0.1, radius - NEAR_FAR_MARGIN);
    const far = radius + NEAR_FAR_MARGIN;
    return { view: lookAt(camera.getEye(), [0, 0, 0], camera.getUp()), projection: perspective(FOV_Y_RADIANS, aspect, near, far) };
  }

  function renderNow(cubies: readonly PhysicalCubie[], inFlight: InFlight | null): void {
    resize();
    const { view, projection } = viewProjection();
    glScene.render(cubies, inFlight, view, projection, camera.getEye(), camera.getUp());
  }

  onContextLost(() => {
    info.textContent = "WebGL context lost.";
  });
  onContextRestored(() => {
    // The lost context took its program, buffers and VAO with it.
    const cubies = homeCubiesWithCore();
    glScene = createGlScene(gl, cubies, cubies.length - 1);
    info.textContent = "";
    requestRedraw();
  });

  new ResizeObserver(requestRedraw).observe(canvas);

  player.snapTo(homeCubiesWithCore());
  camera.setRadius(Number(radiusInput.value));
  camera.attachDrag(stage);
  attachZoom(canvas, radiusInput, camera);
  requestRedraw();

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
    const setupMoves = invert(solutionMoves);
    const flatSetup = applyMoves(SOLVED, setupMoves);
    camera.setCorrective(homeRotation(flatSetup));
    glScene.setMask(c.mask);
    player.snapTo(applyAlgToCubies(homeCubiesWithCore(), setupMoves));
    info.textContent = `${c.id} — ${c.algs[0].display}`;
    stepControls.loadCase(solutionMoves);
    if (!stepControls.isStepMode()) await player.play(solutionMoves);
  }

  function loadSolved(): void {
    resetPlayback();
    syncCameraMode();
    camera.setCorrective([]);
    glScene.setMask(null);
    player.snapTo(homeCubiesWithCore());
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

  if (new URLSearchParams(location.search).has("debug")) {
    window.__threeD = {
      renderAt: (setupMovesText, moveText, fraction, maskKind, maskSlot) =>
        renderAt(camera, (mask) => glScene.setMask(mask), renderNow, setupMovesText, moveText, fraction, maskKind, maskSlot),
    };
  }
}
