import "./style.css";
import { ALL_CASES } from "./data/algorithms.ts";
import type { CaseSet } from "./data/algorithms.ts";
import { SHIPPED_MODES } from "./lib/prefs.ts";
import type { Mode } from "./lib/prefs.ts";
import { defaultProgress } from "./lib/progress.ts";
import type { Progress } from "./lib/progress.ts";
import { setMode, setNote, setNumberPref, setPref, toggleSet } from "./lib/progress-edit.ts";
import { cardView, chooseAlt, press, start, verifyView } from "./lib/screen.ts";
import type { Action, Screen } from "./lib/screen.ts";
import { offeredSets } from "./lib/selection.ts";
import { exportJson, importJson, load, save, wipe } from "./lib/storage.ts";
import { createFlashcard } from "./ui/flashcard.ts";
import { createHelp } from "./ui/help.ts";
import { createHome } from "./ui/home.ts";
import { bindKeys } from "./ui/keys.ts";
import { createMenu } from "./ui/menu.ts";
import { createPrefBar } from "./ui/pref-bar.ts";
import { renderApp } from "./ui/render-app.ts";
import { createStatus } from "./ui/status.ts";
import { createSummary } from "./ui/summary.ts";
import { createTopbar } from "./ui/topbar.ts";
import { isTouchPrimary } from "./ui/touch.ts";
import { createVerify } from "./ui/verify.ts";

const NOT_SAVING = "Progress can't be saved in this browser. Export it to keep it.";
const SET_ASIDE = "Saved progress could not be read and was set aside. Starting fresh.";

const loaded = load(ALL_CASES);
let progress = loaded.progress;
let screen: Screen = { kind: "home" };
const touchPrimary = isTouchPrimary();

const status = createStatus();
const topbar = createTopbar({
  onHome: () => goHome(),
  onMenu: () => {
    help.close();
    menu.toggle();
  },
  onHelp: () => {
    menu.close();
    help.toggle();
  },
  onNotes: () => (screen.kind === "verify" ? verify.editNote() : flashcard.editNote()),
  onThreeD: () => commit(setPref(progress, "threeD", !progress.prefs.threeD)),
});
const play = {
  onSpeed: (speed: number) => commit(setNumberPref(progress, "speed", speed)),
  onZoom: (zoom: number) => commit(setNumberPref(progress, "zoom", zoom)),
};
const home = createHome({
  modes: SHIPPED_MODES,
  sets: offeredSets(ALL_CASES),
  onMode: (mode) => commit(setMode(progress, mode)),
  onSet: (set) => switchSet(set),
  onShuffle: () => commit(setPref(progress, "shuffle", !progress.prefs.shuffle)),
  onRotation: () => commit(setPref(progress, "randomRotation", !progress.prefs.randomRotation)),
  onStart: () => startMode(progress.prefs.mode),
});
const prefBar = createPrefBar({
  onNames: () => handle("toggleNames"),
  onAutoReveal: () => commit(setPref(progress, "showSolutions", !progress.prefs.showSolutions)),
  onNotes: () => commit(setPref(progress, "showNotes", !progress.prefs.showNotes)),
  onHotkeys: () => commit(setPref(progress, "showHotkeys", !progress.prefs.showHotkeys)),
  touchPrimary,
});
topbar.left.append(prefBar.element);
const flashcard = createFlashcard({
  onReveal: () => handle("reveal"),
  onDontKnow: () => handle("dontKnow"),
  onKnow: () => handle("know"),
  onNext: () => handle("next"),
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
  onNote: (text) => {
    const v = verifyView(screen);
    if (v === null) throw new Error("note edited with no case on screen");
    persist(setNote(progress, v.current.id, text));
  },
  onRestart: () => startMode("verify"),
  onHome: goHome,
  play,
});
const summary = createSummary(() => handle("reveal"), goHome);
const menu = createMenu({
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
  onWipe: () => {
    const wiped = wipe();
    progress = defaultProgress();
    menu.close();
    status.show(wiped ? "Data wiped from this browser." : "Could not wipe this browser's storage.");
    render();
  },
  notify: (message) => status.show(message),
  onOpenChange: (open) => topbar.setMenuOpen(open),
  trigger: topbar.menuButton,
});
const help = createHelp(topbar.helpButton, (open) => topbar.setHelpOpen(open));

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

function switchSet(set: CaseSet): void {
  commit(toggleSet(progress, progress.prefs.mode, set));
}

const render = (): void =>
  renderApp({ topbar, menu, help, home, prefBar, flashcard, verify, summary }, progress, screen);

function handle(action: Action): void {
  const next = press(screen, action, context());
  screen = next.screen;
  if (next.progress !== progress) persist(next.progress);
  render();
}

document.body.append(
  topbar.element,
  menu.element,
  help.element,
  status.element,
  home.element,
  flashcard.element,
  verify.element,
  summary.element,
);
bindKeys(handle, (step) => flashcard.step(step) || verify.step(step), () => screen.kind === "drill");
if (loaded.problem === "unreadable") status.show(SET_ASIDE);
if (loaded.problem === "unavailable") status.show(NOT_SAVING);
render();
