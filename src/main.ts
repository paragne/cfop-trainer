import "./style.css";
import { ALL_CASES, CASE_SETS } from "./data/algorithms.ts";
import type { CaseSet } from "./data/algorithms.ts";
import type { Progress } from "./lib/progress.ts";
import { setNote, setPref, toggleSet } from "./lib/progress-edit.ts";
import { answer, current, startSession, toggleReveal } from "./lib/session.ts";
import { exportJson, importJson, load, save } from "./lib/storage.ts";
import { createDataPanel } from "./ui/data-panel.ts";
import { createFlashcard } from "./ui/flashcard.ts";
import { bindKeys } from "./ui/keys.ts";
import type { KeyAction } from "./ui/keys.ts";
import { createStatus } from "./ui/status.ts";
import { createSummary } from "./ui/summary.ts";
import { createToolbar } from "./ui/toolbar.ts";
import { createTopbar } from "./ui/topbar.ts";

const NOT_SAVING = "Progress can't be saved in this browser. Export it to keep it.";
const SET_ASIDE = "Saved progress could not be read and was set aside. Starting fresh.";

const loaded = load(ALL_CASES);
let progress = loaded.progress;
let session = startSession(ALL_CASES, progress, Date.now(), Math.random);

const status = createStatus();
const topbar = createTopbar({ onHome: () => restart(), onData: () => dataPanel.toggle() });
const flashcard = createFlashcard({
  onReveal: () => handle("reveal"),
  onDontKnow: () => handle("dontKnow"),
  onKnow: () => handle("know"),
  onNote: (text) => {
    const c = current(session);
    if (c === null) throw new Error("note edited with no current case");
    persist(setNote(progress, c.id, text));
  },
});
const summary = createSummary(() => restart());
const toolbar = createToolbar({
  sets: CASE_SETS,
  onSet: (set) => switchSet(set),
  onNames: () => handle("toggleNames"),
  onAutoReveal: () => {
    persist(setPref(progress, "showSolutions", !progress.prefs.showSolutions));
    render();
  },
});
const dataPanel = createDataPanel({
  cases: ALL_CASES,
  cardCount: () => Object.keys(progress.cards).length,
  onExport: () => exportJson(progress, Date.now()),
  onImport: (text, mode) => {
    const result = importJson(text, mode, progress, ALL_CASES, Date.now());
    if (result.ok) {
      progress = result.progress;
      restart();
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

function restart(): void {
  session = startSession(ALL_CASES, progress, Date.now(), Math.random);
  render();
}

// The card set changes with the sets, so the queue is rebuilt. Switching off
// the last set is a no-op that toggleSet reports by returning its input.
function switchSet(set: CaseSet): void {
  const next = toggleSet(progress, "learn", set);
  if (next === progress) return;
  persist(next);
  restart();
}

function render(): void {
  toolbar.render(progress);
  const finished = current(session) === null;
  flashcard.element.hidden = finished;
  summary.element.hidden = !finished;
  if (finished) summary.render(session);
  else flashcard.render(session, progress);
}

function handle(action: KeyAction): void {
  if (action === "toggleNames") {
    persist(setPref(progress, "showNames", !progress.prefs.showNames));
  } else if (current(session) === null) {
    if (action === "reveal") restart();
    return;
  } else if (action === "reveal") {
    session = toggleReveal(session);
  } else {
    const result = answer(session, progress, action === "know", Date.now());
    session = result.session;
    persist(result.progress);
  }
  render();
}

document.body.append(
  topbar.element,
  dataPanel.element,
  status.element,
  toolbar.element,
  flashcard.element,
  summary.element,
);
bindKeys(handle);
if (loaded.problem === "unreadable") status.show(SET_ASIDE);
if (loaded.problem === "unavailable") status.show(NOT_SAVING);
render();
