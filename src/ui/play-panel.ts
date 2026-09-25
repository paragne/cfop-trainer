import { caseMask } from "../lib/case-state.ts";
import { cubiesFromColors } from "../lib/physical-cube.ts";
import { algMoves, playStart } from "../lib/play.ts";
import type { CaseView, PlayView } from "../lib/play.ts";
import type { Prefs } from "../lib/prefs.ts";
import type { Progress } from "../lib/progress.ts";
import { starredAlg } from "../lib/stars.ts";
import { createAlgStrip } from "./alg-strip.ts";
import { el } from "./dom.ts";
import type { Step } from "./keys.ts";
import { createTransport } from "./transport.ts";
import { withCore } from "./three-d/core-cubie.ts";
import { createLegend } from "./three-d/legend.ts";
import { legendFaces, startPanelSession } from "./three-d/panel-session.ts";
import type { PanelSession } from "./three-d/panel-session.ts";

export type PlayHandlers = {
  onStar: (algIndex: number) => void;
  onSpeed: (speed: number) => void;
  onZoom: (zoom: number) => void;
};

// How long the start position stays up before Play begins from mid-algorithm.
const START_HOLD_MS = 500;

// A card's picture: the 2D one, or the case in 3D. The GPU context lives only
// while a card is in 3D: created when it first shows, given back on close.
// The solution's controls appear with the solution, and never before.
export function createPlayPanel({ onStar, onSpeed, onZoom }: PlayHandlers) {
  const element = el("div", "view");
  const picture = el("div", "picture");
  const player = el("div", "player");
  player.hidden = true;
  const stage = el("div", "stage");
  const strip = createAlgStrip();

  const { topRow, bottomRow, speedPop, algPicker } = createTransport({
    onChooseAlg: chooseAlg,
    onStar,
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
  let shown: CaseView | null = null;
  let solution: PlayView | null = null;
  // What animates: the screen's own pick (the starred alg) until the picker
  // says otherwise. Only a preview, so it is never written anywhere.
  let chosenAlg = 0;

  function refreshLegend(): void {
    legend.update(session === null || shown === null ? null : legendFaces(session, shown.c));
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

  // Back to the start of the case, so a half-played solution never outlives
  // the controls that were showing it.
  function load({ view, stepper }: PanelSession): void {
    if (shown === null) return;
    view.showCase(caseMask(shown.c), withCore(cubiesFromColors(playStart(shown.c, shown.auf))));
    const moves = solution === null ? [] : algMoves(shown.c, shown.auf, chosenAlg);
    strip.load(moves);
    stepper.load(moves);
  }

  function chooseAlg(algIndex: number): void {
    chosenAlg = algIndex;
    clearTimeout(hold);
    if (session !== null) load(session);
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
    speedPop.close();
    algPicker.close();
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

  function open(next: CaseView, play: PlayView | null, prefs: Prefs, stars: Progress["stars"]): void {
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
      if (session.caseKey !== next.key) {
        session.caseKey = next.key;
        session.view.camera.setMode("locked");
      }
      clearTimeout(hold);
      chosenAlg = play?.alg ?? 0;
      load(session);
    }
    algPicker.sync(play !== null, next.c, next.auf, chosenAlg, starredAlg(next.c, stars));
    strip.setPosition(session.stepper.boundary());
    speedPop.setValue(prefs.speed);
  }

  return {
    element,
    // Where the 2D picture goes.
    picture,
    // Null closes the 3D view and gives its GPU context back.
    // Says whether the 3D view is showing.
    show(next: CaseView | null, play: PlayView | null, prefs: Prefs, stars: Progress["stars"]): boolean {
      if (next === null) close();
      else open(next, play, prefs, stars);
      return session !== null;
    },
    // Whether the key was used, so an arrow with nothing to step keeps its default.
    step(direction: Step): boolean {
      if (session === null || controls.hidden) return false;
      step(direction);
      return true;
    },
  };
}
