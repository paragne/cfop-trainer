import "./style.css";
import { ALL_CASES, CASE_SETS } from "./data/algorithms.ts";
import type { CaseSet } from "./data/algorithms.ts";
import { SHIPPED_MODES } from "./lib/prefs.ts";
import type { Mode } from "./lib/prefs.ts";
import { caseView, playView } from "./lib/play.ts";
import type { Progress } from "./lib/progress.ts";
import { setMode, setNote, setNumberPref, setPref, setVerifyLength, toggleSet } from "./lib/progress-edit.ts";
import { cardView, chooseAlt, press, resultText, start, verifyView } from "./lib/screen.ts";
import type { Action, Screen } from "./lib/screen.ts";
import { dueCount, setStats } from "./lib/stats.ts";
import { exportJson, importJson, load, save } from "./lib/storage.ts";
import { createDataPanel } from "./ui/data-panel.ts";
import { createFlashcard } from "./ui/flashcard.ts";
import { createHome } from "./ui/home.ts";
import { bindKeys } from "./ui/keys.ts";
import { createPrefBar } from "./ui/pref-bar.ts";
import { createStatus } from "./ui/status.ts";
import { createSummary } from "./ui/summary.ts";
import { webgl2Available } from "./ui/three-d/webgl-support.ts";
import { createTopbar } from "./ui/topbar.ts";
import { createVerify } from "./ui/verify.ts";

const NOT_SAVING = "Progress can't be saved in this browser. Export it to keep it.";
const SET_ASIDE = "Saved progress could not be read and was set aside. Starting fresh.";

const loaded = load(ALL_CASES);
let progress = loaded.progress;
let screen: Screen = { kind: "home" };

const status = createStatus();
const topbar = createTopbar({
  onHome: () => goHome(),
  onData: () => dataPanel.toggle(),
  onThreeD: () => commit(setPref(progress, "threeD", !progress.prefs.threeD)),
});
const play = {
  onSpeed: (speed: number) => commit(setNumberPref(progress, "speed", speed)),
  onZoom: (zoom: number) => commit(setNumberPref(progress, "zoom", zoom)),
};
const home = createHome({
  modes: SHIPPED_MODES,
  sets: CASE_SETS,
  onMode: (mode) => commit(setMode(progress, mode)),
  onSet: (set) => switchSet(set),
  onRotation: () => commit(setPref(progress, "randomRotation", !progress.prefs.randomRotation)),
  onVerifyLength: (length) => commit(setVerifyLength(progress, length)),
  onStart: () => startMode(progress.prefs.mode),
});
const prefBar = createPrefBar({
  onNames: () => handle("toggleNames"),
  onAutoReveal: () => commit(setPref(progress, "showSolutions", !progress.prefs.showSolutions)),
});
const flashcard = createFlashcard({
  onReveal: () => handle("reveal"),
  onDontKnow: () => handle("dontKnow"),
  onKnow: () => handle("know"),
  onNext: () => handle("know"),
  onNote: (text) => {
    const view = cardView(screen);
    if (view === null) throw new Error("note edited with no card on screen");
    persist(setNote(progress, view.c.id, text));
  },
  play,
});
const verify = createVerify({
  onPrimary: () => handle("reveal"),
  onMismatch: () => handle("dontKnow"),
  onMatch: () => handle("know"),
  onChoose: (i) => {
    screen = chooseAlt(screen, i);
    render();
  },
  play,
});
const summary = createSummary(() => handle("reveal"));
const dataPanel = createDataPanel({
  cases: ALL_CASES,
  cardCount: () => Object.keys(progress.cards).length,
  onExport: () => exportJson(progress, Date.now()),
  onImport: (text, importMode) => {
    const result = importJson(text, importMode, progress, ALL_CASES, Date.now());
    if (result.ok) {
      progress = result.progress;
      if (screen.kind === "home") render();
      else startMode(screen.kind);
    }
    return result;
  },
  notify: (message) => status.show(message),
  onOpenChange: (open) => topbar.setDataOpen(open),
  trigger: topbar.dataButton,
});

function persist(next: Progress): void {
  progress = next;
  status.show(save(progress, Date.now()) ? null : NOT_SAVING);
}

function commit(next: Progress): void {
  persist(next);
  render();
}

const context = () => ({ progress, cases: ALL_CASES, now: Date.now(), random: Math.random });

function goHome(): void {
  screen = { kind: "home" };
  render();
}

function startMode(mode: Mode): void {
  screen = start(mode, context());
  render();
}

// Switching off the last set is a no-op that toggleSet reports by returning
// its input.
function switchSet(set: CaseSet): void {
  const next = toggleSet(progress, progress.prefs.mode, set);
  if (next !== progress) persist(next);
  render();
}

function render(): void {
  const onHome = screen.kind === "home";
  topbar.setDataAvailable(onHome);
  if (!onHome) dataPanel.close();
  home.element.hidden = !onHome;
  prefBar.element.hidden = onHome;
  if (onHome) {
    const now = Date.now();
    home.render({
      mode: progress.prefs.mode,
      selected: progress.prefs.sets[progress.prefs.mode],
      rotation: progress.prefs.randomRotation,
      verifyLength: progress.prefs.verifyLength,
      learnDue: dueCount(ALL_CASES, progress.cards, progress.prefs.sets.learn, now),
      stats: setStats(ALL_CASES, progress.cards, now),
    });
  } else {
    prefBar.render(progress);
  }
  const view = cardView(screen);
  const verifying = verifyView(screen);
  const result = resultText(screen);
  flashcard.element.hidden = view === null;
  verify.element.hidden = verifying === null;
  summary.element.hidden = result === null;
  if (view !== null) flashcard.render(view, progress);
  if (verifying !== null) verify.render(verifying, progress);
  if (result !== null) summary.render(result);

  const available = webgl2Available();
  const shown = progress.prefs.threeD && available ? caseView(screen) : null;
  const playing = shown === null ? null : playView(screen);
  topbar.setThreeD(available && (view !== null || verifying !== null), progress.prefs.threeD);
  flashcard.setPlay(view === null ? null : shown, playing, progress.prefs);
  verify.setPlay(verifying === null ? null : shown, playing, progress.prefs);
}

function handle(action: Action): void {
  const next = press(screen, action, context());
  screen = next.screen;
  if (next.progress !== progress) persist(next.progress);
  render();
}

document.body.append(
  topbar.element,
  dataPanel.element,
  status.element,
  home.element,
  prefBar.element,
  flashcard.element,
  verify.element,
  summary.element,
);
bindKeys(handle, (step) => flashcard.step(step) || verify.step(step));
if (loaded.problem === "unreadable") status.show(SET_ASIDE);
if (loaded.problem === "unavailable") status.show(NOT_SAVING);
render();
