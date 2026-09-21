import "./style.css";
import { ALL_CASES, CASE_SETS } from "./data/algorithms.ts";
import type { Case, CaseSet } from "./data/algorithms.ts";
import { nextCase, startDrill } from "./lib/drill.ts";
import type { Drill } from "./lib/drill.ts";
import { SHIPPED_MODES } from "./lib/prefs.ts";
import type { Mode } from "./lib/prefs.ts";
import type { Progress } from "./lib/progress.ts";
import { setMode, setNote, setPref, toggleSet } from "./lib/progress-edit.ts";
import { answer, current, startSession, toggleReveal } from "./lib/session.ts";
import type { Session } from "./lib/session.ts";
import { dueCount, setStats } from "./lib/stats.ts";
import { exportJson, importJson, load, save } from "./lib/storage.ts";
import { createDataPanel } from "./ui/data-panel.ts";
import { createFlashcard } from "./ui/flashcard.ts";
import type { CardView } from "./ui/flashcard.ts";
import { createHome } from "./ui/home.ts";
import { bindKeys } from "./ui/keys.ts";
import type { KeyAction } from "./ui/keys.ts";
import { createPrefBar } from "./ui/pref-bar.ts";
import { createStatus } from "./ui/status.ts";
import { createSummary } from "./ui/summary.ts";
import { createTopbar } from "./ui/topbar.ts";

const NOT_SAVING = "Progress can't be saved in this browser. Export it to keep it.";
const SET_ASIDE = "Saved progress could not be read and was set aside. Starting fresh.";

type Screen =
  | { kind: "home" }
  | { kind: "learn"; session: Session }
  | { kind: "drill"; drill: Drill };

const loaded = load(ALL_CASES);
let progress = loaded.progress;
let screen: Screen = { kind: "home" };

const status = createStatus();
const topbar = createTopbar({ onHome: () => goHome(), onData: () => dataPanel.toggle() });
const home = createHome({
  modes: SHIPPED_MODES,
  sets: CASE_SETS,
  onMode: (mode) => {
    persist(setMode(progress, mode));
    render();
  },
  onSet: (set) => switchSet(set),
  onStart: () => start(progress.prefs.mode),
});
const prefBar = createPrefBar({
  onNames: () => handle("toggleNames"),
  onAutoReveal: () => {
    persist(setPref(progress, "showSolutions", !progress.prefs.showSolutions));
    render();
  },
});
const flashcard = createFlashcard({
  onReveal: () => handle("reveal"),
  onDontKnow: () => handle("dontKnow"),
  onKnow: () => handle("know"),
  onNext: () => handle("know"),
  onNote: (text) => {
    const c = shown();
    if (c === null) throw new Error("note edited with no card on screen");
    persist(setNote(progress, c.id, text));
  },
});
const summary = createSummary(() => start("learn"));
const dataPanel = createDataPanel({
  cases: ALL_CASES,
  cardCount: () => Object.keys(progress.cards).length,
  onExport: () => exportJson(progress, Date.now()),
  onImport: (text, importMode) => {
    const result = importJson(text, importMode, progress, ALL_CASES, Date.now());
    if (result.ok) {
      progress = result.progress;
      if (screen.kind === "home") render();
      else start(screen.kind);
    }
    return result;
  },
  notify: (message) => status.show(message),
  onOpenChange: (open) => topbar.setDataOpen(open),
});

function persist(next: Progress): void {
  progress = next;
  status.show(save(progress, Date.now()) ? null : NOT_SAVING);
}

function goHome(): void {
  screen = { kind: "home" };
  render();
}

function start(mode: Mode): void {
  const now = Date.now();
  if (mode === "learn") {
    screen = { kind: "learn", session: startSession(ALL_CASES, progress, now, Math.random) };
  } else if (mode === "drill") {
    screen = { kind: "drill", drill: startDrill(ALL_CASES, progress, Math.random) };
  } else {
    throw new Error("Verify has not shipped");
  }
  render();
}

// Switching off the last set is a no-op that toggleSet reports by returning
// its input.
function switchSet(set: CaseSet): void {
  const next = toggleSet(progress, progress.prefs.mode, set);
  if (next !== progress) persist(next);
  render();
}

function shown(): Case | null {
  if (screen.kind === "learn") return current(screen.session);
  return screen.kind === "drill" ? screen.drill.current : null;
}

function cardView(): CardView | null {
  if (screen.kind === "drill") {
    const { current: c, revealed, shown: count } = screen.drill;
    return { c, revealed, count: String(count), mode: "drill" };
  }
  const c = shown();
  if (screen.kind !== "learn" || c === null) return null;
  const { revealed, done, total } = screen.session;
  return { c, revealed, count: `${done} / ${total}`, mode: "learn" };
}

function render(): void {
  const onHome = screen.kind === "home";
  home.element.hidden = !onHome;
  prefBar.element.hidden = onHome;
  if (onHome) {
    const now = Date.now();
    home.render({
      mode: progress.prefs.mode,
      selected: progress.prefs.sets[progress.prefs.mode],
      learnDue: dueCount(ALL_CASES, progress.cards, progress.prefs.sets.learn, now),
      stats: setStats(ALL_CASES, progress.cards, now),
    });
  } else {
    prefBar.render(progress);
  }
  const view = cardView();
  flashcard.element.hidden = view === null;
  summary.element.hidden = screen.kind !== "learn" || view !== null;
  if (view !== null) flashcard.render(view, progress);
  else if (screen.kind === "learn") summary.render(screen.session);
}

// In Drill, "know" is Next and "dontKnow" is not bound.
function handle(action: KeyAction): void {
  if (screen.kind === "home") {
    if (action === "reveal") start(progress.prefs.mode);
    return;
  }
  if (action === "toggleNames") {
    persist(setPref(progress, "showNames", !progress.prefs.showNames));
  } else if (screen.kind === "drill") {
    if (action === "dontKnow") return;
    screen = {
      kind: "drill",
      drill: action === "reveal" ? toggleReveal(screen.drill) : nextCase(screen.drill, progress, Math.random),
    };
  } else if (current(screen.session) === null) {
    if (action === "reveal") start("learn");
    return;
  } else if (action === "reveal") {
    screen = { kind: "learn", session: toggleReveal(screen.session) };
  } else {
    const result = answer(screen.session, progress, action === "know", Date.now());
    screen = { kind: "learn", session: result.session };
    persist(result.progress);
  }
  render();
}

document.body.append(
  topbar.element,
  dataPanel.element,
  status.element,
  home.element,
  prefBar.element,
  flashcard.element,
  summary.element,
);
bindKeys(handle);
if (loaded.problem === "unreadable") status.show(SET_ASIDE);
if (loaded.problem === "unavailable") status.show(NOT_SAVING);
render();
