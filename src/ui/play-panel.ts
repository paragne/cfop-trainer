import { toRgb } from "../lib/palette.ts";
import { cubiesFromColors } from "../lib/physical-cube.ts";
import { playStart } from "../lib/play.ts";
import type { CaseView, PlayView } from "../lib/play.ts";
import { SPEED_RANGE, ZOOM_RANGE } from "../lib/prefs.ts";
import type { Prefs } from "../lib/prefs.ts";
import { createAlgStrip } from "./alg-strip.ts";
import { el } from "./dom.ts";
import type { Step } from "./keys.ts";
import { withCore } from "./three-d/core-cubie.ts";
import { createCubeView } from "./three-d/cube-view.ts";
import type { CubeView } from "./three-d/cube-view.ts";
import { createGlContext } from "./three-d/gl-context.ts";
import type { GlContext } from "./three-d/gl-context.ts";
import { speedToDurationMs } from "./three-d/player.ts";
import { createStepMode } from "./three-d/step-mode.ts";
import type { StepMode } from "./three-d/step-mode.ts";
import { attachZoom } from "./three-d/zoom.ts";

export type PlayHandlers = {
  onSpeed: (speed: number) => void;
  onZoom: (zoom: number) => void;
};

type Session = {
  gl: GlContext;
  view: CubeView;
  stepper: StepMode;
  // What is loaded, so a render that changes nothing does not restart playback.
  loaded: string;
};

// How long the start position stays up before Play begins from mid-algorithm.
const START_HOLD_MS = 500;

// style.css's --bg: the 3D view sits in the page's own black.
const VOID = toRgb("#0b0b0c");

function iconButton(label: string, glyph: string, onClick: () => void): HTMLButtonElement {
  const node = el("button", "step", glyph);
  node.type = "button";
  node.title = label;
  node.setAttribute("aria-label", label);
  node.addEventListener("click", onClick);
  return node;
}

// A card's picture: the 2D one, or the case in 3D. The GPU context lives only
// while a card is in 3D: created when it first shows, given back on close.
// The solution's controls appear with the solution, and never before.
export function createPlayPanel({ onSpeed, onZoom }: PlayHandlers) {
  const element = el("div", "view");
  const picture = el("div", "picture");
  const player = el("div", "player");
  player.hidden = true;
  const stage = el("div", "stage");
  const strip = createAlgStrip();

  const speedInput = el("input", "");
  speedInput.type = "range";
  speedInput.min = String(SPEED_RANGE.min);
  speedInput.max = String(SPEED_RANGE.max);
  speedInput.step = String(SPEED_RANGE.step);
  speedInput.setAttribute("aria-label", "Speed");
  speedInput.addEventListener("input", () => {
    speedValue = Number(speedInput.value);
    onSpeed(speedValue);
  });
  const speed = el("label", "slider", "Speed");
  speed.append(speedInput);

  const buttons = el("div", "step-buttons");
  buttons.append(
    iconButton("Step back", "<", () => step("back")),
    iconButton("Step forward", ">", () => step("forward")),
    iconButton("Play", "▶", play),
  );
  const transport = el("div", "transport");
  transport.append(strip.element, buttons);
  const controls = el("div", "controls");
  controls.hidden = true;
  controls.append(transport, speed);
  player.append(stage, controls);
  element.append(picture, player);

  let session: Session | null = null;
  let hold: ReturnType<typeof setTimeout> | undefined;
  let speedValue = 1;
  let zoomValue = 1;
  let shown: CaseView | null = null;
  let solution: PlayView | null = null;

  function start(): Session | null {
    const canvas = document.createElement("canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Cube in 3D");
    stage.replaceChildren(canvas);
    const gl = createGlContext(canvas);
    if (gl === null) {
      canvas.remove();
      return null;
    }
    const view = createCubeView(canvas, gl, () => speedValue, VOID);
    view.setFit(true);
    attachZoom(canvas, (farther) => onZoom(Math.min(ZOOM_RANGE.max, Math.max(ZOOM_RANGE.min, zoomValue / farther))));
    const stepper: StepMode = createStepMode(view.player, {
      onSettled: () => strip.setPosition(stepper.boundary()),
      onProgress: strip.setPosition,
      durationMs: () => speedToDurationMs(speedValue),
    });
    return { gl, view, stepper, loaded: "" };
  }

  // Back to the start of the case, so a half-played solution never outlives
  // the controls that were showing it.
  function load({ view, stepper }: Session): void {
    if (shown === null) return;
    view.showCase(shown.c.mask, withCore(cubiesFromColors(playStart(shown.c, shown.auf))));
    const moves = solution?.moves ?? [];
    strip.load(moves);
    stepper.load(moves);
  }

  // Playing from the end or halfway through would be disorienting, so the
  // cube first returns to the start and sits there for a moment.
  function play(): void {
    clearTimeout(hold);
    if (session === null) return;
    if (session.stepper.boundary() === 0) {
      session.stepper.playAll();
      return;
    }
    load(session);
    const held = session;
    hold = setTimeout(() => held.stepper.playAll(), START_HOLD_MS);
  }

  function step(direction: Step): void {
    clearTimeout(hold);
    if (direction === "forward") session?.stepper.stepForward();
    else session?.stepper.stepBackward();
  }

  function close(): void {
    clearTimeout(hold);
    picture.hidden = false;
    player.hidden = true;
    controls.hidden = true;
    if (session === null) return;
    session.view.dispose();
    session.gl.release();
    stage.replaceChildren();
    session = null;
  }

  function open(next: CaseView, play: PlayView | null, prefs: Prefs): void {
    player.hidden = false;
    session ??= start();
    if (session === null) {
      close();
      return;
    }
    picture.hidden = true;
    speedValue = prefs.speed;
    zoomValue = prefs.zoom;
    shown = next;
    solution = play;
    session.view.setZoom(prefs.zoom);
    controls.hidden = play === null;
    const id = `${next.key}|${play === null ? "-" : play.alg}`;
    if (session.loaded !== id) {
      session.loaded = id;
      clearTimeout(hold);
      load(session);
    }
    strip.setPosition(session.stepper.boundary());
    speedInput.value = String(prefs.speed);
  }

  return {
    element,
    // Where the 2D picture goes.
    picture,
    // Null closes the 3D view and gives its GPU context back.
    show(next: CaseView | null, play: PlayView | null, prefs: Prefs): void {
      if (next === null) close();
      else open(next, play, prefs);
    },
    // Whether the key was used, so an arrow with nothing to step keeps its default.
    step(direction: Step): boolean {
      if (session === null || controls.hidden) return false;
      step(direction);
      return true;
    },
  };
}
