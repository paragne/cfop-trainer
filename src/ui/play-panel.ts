import { cubiesFromColors } from "../lib/physical-cube.ts";
import { playStart } from "../lib/play.ts";
import type { PlayView } from "../lib/play.ts";
import { RADIUS_RANGE, SPEED_RANGE } from "../lib/prefs.ts";
import type { Prefs } from "../lib/prefs.ts";
import { el, keyedButton, toggleButton } from "./dom.ts";
import type { Step } from "./keys.ts";
import { renderAlg } from "./three-d/alg-display.ts";
import { withCore } from "./three-d/core-cubie.ts";
import { createCubeView } from "./three-d/cube-view.ts";
import type { CubeView } from "./three-d/cube-view.ts";
import { createGlContext } from "./three-d/gl-context.ts";
import type { GlContext } from "./three-d/gl-context.ts";
import { createStepMode } from "./three-d/step-mode.ts";
import type { StepMode } from "./three-d/step-mode.ts";
import { attachZoom } from "./three-d/zoom.ts";

export type PlayHandlers = {
  onStepMode: (on: boolean) => void;
  onSpeed: (speed: number) => void;
  onRadius: (radius: number) => void;
  onBack: () => void;
  onLost: () => void;
};

type Session = {
  gl: GlContext;
  view: CubeView;
  stepper: StepMode;
  // What is loaded, so a render that changes nothing does not restart playback.
  loaded: string;
  play: PlayView;
  stepping: boolean;
};

function slider(label: string, range: { min: number; max: number; step: number }, onInput: (n: number) => void) {
  const input = el("input", "");
  input.type = "range";
  input.min = String(range.min);
  input.max = String(range.max);
  input.step = String(range.step);
  input.setAttribute("aria-label", label);
  input.addEventListener("input", () => onInput(Number(input.value)));
  const node = el("label", "slider", label);
  node.append(input);
  return { node, input };
}

// A card's picture: the 2D one, or the 3D view of it while it plays. The GPU
// context lives only while a card is being played: created on open, given back
// on close.
export function createPlayPanel({ onStepMode, onSpeed, onRadius, onBack, onLost }: PlayHandlers) {
  const element = el("div", "view");
  const picture = el("div", "picture");
  const player = el("div", "player");
  player.hidden = true;
  const stage = el("div", "stage");
  const alg = el("p", "alg-steps");
  const replay = toggleButton("Replay", () => {
    if (session !== null) load(session);
  });
  const stepToggle = toggleButton("Step", () => onStepMode(stepToggle.getAttribute("aria-pressed") !== "true"));
  const speed = slider("Speed", SPEED_RANGE, (n) => {
    speedValue = n;
    onSpeed(n);
  });
  const radius = slider("Radius", RADIUS_RANGE, (n) => {
    session?.view.camera.setRadius(n);
    onRadius(n);
  });
  const controls = el("div", "player-controls");
  controls.append(replay, stepToggle, toggleButton("2D", onBack), speed.node, radius.node);
  player.append(stage, alg, controls);
  element.append(picture, player);

  const prev = keyedButton("", "Prev", "←", () => session?.stepper.stepBackward());
  const next = keyedButton("", "Next", "→", () => session?.stepper.stepForward());
  const steps = el("div", "steps");
  steps.hidden = true;
  steps.append(prev.node, next.node);

  let session: Session | null = null;
  let speedValue = 1;

  function start(play: PlayView, stepping: boolean): Session | null {
    const canvas = document.createElement("canvas");
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Cube in 3D");
    stage.replaceChildren(canvas);
    const gl = createGlContext(canvas);
    if (gl === null) {
      canvas.remove();
      return null;
    }
    const view = createCubeView(canvas, gl, () => speedValue);
    attachZoom(canvas, radius.input, view.camera);
    gl.onContextLost(() => {
      if (session?.gl === gl) onLost();
    });
    const stepper: StepMode = createStepMode(view.player, () => renderAlg(alg, stepper.moves(), stepper.currentIndex()));
    return { gl, view, stepper, loaded: "", play, stepping };
  }

  function load({ view, stepper, play, stepping }: Session): void {
    view.showCase(play.c.mask, withCore(cubiesFromColors(playStart(play.c, play.auf))));
    stepper.load(play.moves);
    if (!stepping) void view.player.play(play.moves);
  }

  function close(): void {
    picture.hidden = false;
    player.hidden = true;
    steps.hidden = true;
    if (session === null) return;
    session.view.dispose();
    session.gl.release();
    stage.replaceChildren();
    alg.replaceChildren();
    session = null;
  }

  function open(play: PlayView, prefs: Prefs): void {
    picture.hidden = true;
    player.hidden = false;
    speedValue = prefs.speed;
    session ??= start(play, prefs.stepMode);
    if (session === null) {
      queueMicrotask(onLost);
      return;
    }
    session.play = play;
    session.stepping = prefs.stepMode;
    const id = `${play.key}|${play.alg}|${prefs.stepMode}`;
    if (session.loaded !== id) {
      session.loaded = id;
      load(session);
    }
    steps.hidden = !prefs.stepMode;
    alg.hidden = !prefs.stepMode;
    stepToggle.setAttribute("aria-pressed", String(prefs.stepMode));
    speed.input.value = String(prefs.speed);
    radius.input.value = String(prefs.radius);
    session.view.camera.setRadius(prefs.radius);
  }

  return {
    element,
    // Where the 2D picture goes.
    picture,
    // The step buttons, which the card puts in its thumb-reach action bar.
    steps,
    // Null closes the 3D view and gives its GPU context back.
    show(play: PlayView | null, prefs: Prefs): void {
      if (play === null) close();
      else open(play, prefs);
    },
    // Whether the key was used, so an arrow with nothing to step keeps its default.
    step(direction: Step): boolean {
      if (session === null || !session.stepping) return false;
      if (direction === "forward") session.stepper.stepForward();
      else session.stepper.stepBackward();
      return true;
    },
  };
}
