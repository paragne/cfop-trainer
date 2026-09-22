/**
 * Page wiring for the unlinked 3D prototype: mounts the scene and camera,
 * builds the preset buttons and controls. No mode integration — this reads
 * cases from ALL_CASES to animate their solutions, nothing else.
 */
import { ALL_CASES } from "../../data/algorithms.ts";
import type { Case } from "../../data/algorithms.ts";
import { applyMoves, SOLVED } from "../../lib/cube.ts";
import { invert, parse } from "../../lib/notation.ts";
import { applyAlgPhysical, homeStickers } from "../../lib/physical-cube.ts";
import { homeRotation } from "../../lib/orientation.ts";
import { buildScene } from "./scene.ts";
import { createPlayer } from "./player.ts";
import type { Player } from "./player.ts";
import { createCamera } from "./camera.ts";

// Presets chosen to stress the four move kinds that don't reduce to a plain
// face turn: `d` (f2l-slot-3), `y'` (f2l-slot-4), M slices (pll-h), wide `r`
// (oll-24).
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
const rig = required<HTMLElement>("#rig");
const info = required<HTMLElement>("#info");
const presets = required<HTMLElement>("#presets");
const speedInput = required<HTMLInputElement>("#speed");
const radiusInput = required<HTMLInputElement>("#radius");
const freecamInput = required<HTMLInputElement>("#freecam");
const pauseButton = required<HTMLButtonElement>("#pause");

const scene = buildScene(rig, homeStickers());
// camera's onChange needs player (to read current sticker positions) and
// player needs camera (to read its current back vector). player is built
// second, so onChange goes through this cell, resolved once both exist;
// camera makes no call that would invoke onChange before then.
const playerCell: { current: Player | undefined } = { current: undefined };
const camera = createCamera(rig, () => {
  const p = playerCell.current;
  if (p !== undefined) scene.reorderForPaint(p.stickers.map((s) => s.position), camera.getBack());
});
const player = createPlayer(scene, camera.getBack, () => Number(speedInput.value));
playerCell.current = player;
// Must happen before any camera change: onChange reads player.stickers,
// which starts empty until a first snap gives it something to sort.
player.snapTo(homeStickers());
camera.setRadius(Number(radiusInput.value));
camera.attachDrag(stage);

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
  player.snapTo(applyAlgPhysical(homeStickers(), setupMoves));
  info.textContent = `${c.id} — ${c.algs[0].display}`;
  await player.play(solutionMoves);
}

function loadSolved(): void {
  resetPlayback();
  syncCameraMode();
  camera.setCorrective([]);
  player.snapTo(homeStickers());
  info.textContent = "Solved";
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
