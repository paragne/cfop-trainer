import { cubiesFromColors } from "../lib/physical-cube.ts";
import type { Prefs } from "../lib/prefs.ts";
import { createAlgStrip } from "./alg-strip.ts";
import { el } from "./dom.ts";
import type { Step } from "./keys.ts";
import type { Scene, StageHandlers } from "./play-scene.ts";
import { createTransport } from "./transport.ts";
import { withCore } from "./three-d/core-cubie.ts";
import { createLegend } from "./three-d/legend.ts";
import { startPanelSession } from "./three-d/panel-session.ts";
import type { PanelSession } from "./three-d/panel-session.ts";

// How long the start position stays up before Play begins from mid-algorithm.
const START_HOLD_MS = 500;

// The GPU context lives only while a picture is in 3D: created when it first
// shows, given back on close. The solution's controls appear with the
// solution, and never before.
export function createPlayStage({ onSpeed, onAesthetic, onZoom, picker }: StageHandlers) {
  const element = el("div", "view");
  const picture = el("div", "picture");
  const player = el("div", "player");
  player.hidden = true;
  const stage = el("div", "stage");
  const strip = createAlgStrip();

  const { topRow, bottomRow, speedPop, algPicker, aesthetic, closePopups } = createTransport({
    picker,
    onAesthetic,
    onSpeed: (speed) => {
      speedValue = speed;
      onSpeed(speed);
    },
    // Free orbit works whether or not the solution is revealed, so this does too.
    onCenter: () => {
      session?.view.camera.recenter();
      refreshLegend();
    },
    onStartOver: () => step("start"),
    onBack: () => step("back"),
    onPlay: play,
    onForward: () => step("forward"),
  });
  const transport = el("div", "transport");
  transport.append(strip.element, bottomRow);
  const controls = el("div", "controls");
  controls.hidden = true;
  controls.append(transport);
  const legend = createLegend();
  const frame = el("div", "frame");
  frame.append(stage, legend.element, topRow);
  // An orbit ends in the free mode, which has no fixed reading to show.
  stage.addEventListener("pointerup", () => refreshLegend());
  player.append(frame, controls);
  element.append(picture, player);

  let session: PanelSession | null = null;
  let hold: ReturnType<typeof setTimeout> | undefined;
  let speedValue = 1;
  let zoomValue = 1;
  let scene: Scene | null = null;

  function refreshLegend(): void {
    legend.update(session === null || scene === null ? null : scene.legend(session));
  }

  const start = () =>
    startPanelSession({
      stage,
      speed: () => speedValue,
      zoom: () => zoomValue,
      onZoom,
      onSettled: () => {
        if (session === null) return;
        strip.setPosition(session.stepper.boundary());
        refreshLegend();
      },
      onProgress: strip.setPosition,
    });

  // Back to the start of the scene, so a half-played solution never outlives
  // the controls that were showing it.
  function load({ view, stepper }: PanelSession): void {
    if (scene === null) return;
    view.showCase(scene.mask, withCore(cubiesFromColors(scene.start)));
    const moves = scene.moves ?? [];
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
    const stepper = session?.stepper;
    if (direction === "forward") stepper?.stepForward();
    else if (direction === "back") stepper?.stepBackward();
    else if (direction === "start") stepper?.goToStart();
    else stepper?.goToEnd();
  }

  function close(): void {
    clearTimeout(hold);
    closePopups();
    legend.update(null);
    picture.hidden = false;
    player.hidden = true;
    controls.hidden = true;
    if (session === null) return;
    session.view.dispose();
    session.gl.release();
    stage.replaceChildren();
    session = null;
  }

  function open(next: Scene, prefs: Prefs): void {
    player.hidden = false;
    session ??= start();
    if (session === null) {
      close();
      return;
    }
    picture.hidden = true;
    speedValue = prefs.speed;
    zoomValue = prefs.zoom;
    scene = next;
    session.view.setZoom(prefs.zoom);
    session.view.setAesthetic(prefs.aesthetic);
    aesthetic.setValue(prefs.aesthetic);
    controls.hidden = next.moves === null;
    if (session.loaded !== next.id) {
      session.loaded = next.id;
      if (session.caseKey !== next.key) {
        session.caseKey = next.key;
        session.view.camera.setMode("locked");
      }
      clearTimeout(hold);
      load(session);
    }
    strip.setPosition(session.stepper.boundary());
    speedPop.setValue(prefs.speed);
  }

  return {
    element,
    // Where a 2D picture goes, when the caller has one.
    picture,
    algPicker,
    // Null closes the 3D view and gives its GPU context back. Says whether the
    // 3D view is showing.
    show(next: Scene | null, prefs: Prefs): boolean {
      if (next === null) close();
      else open(next, prefs);
      return session !== null;
    },
    // Swaps what is loaded without a render: a preview of another solution.
    reload(next: Scene): void {
      scene = next;
      clearTimeout(hold);
      if (session !== null) load(session);
    },
    // Whether the key was used, so an arrow with nothing to step keeps its default.
    step(direction: Step): boolean {
      if (session === null || controls.hidden) return false;
      step(direction);
      return true;
    },
  };
}
