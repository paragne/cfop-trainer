import { turnState } from "../lib/auf.ts";
import { caseState } from "../lib/case-state.ts";
import type { Progress } from "../lib/progress.ts";
import { renderCase, viewFor } from "../lib/render.ts";
import type { CardView } from "../lib/screen.ts";
import { renderSolution } from "../lib/solution.ts";
import { el, keyedButton } from "./dom.ts";
import { createPlayPanel } from "./play-panel.ts";
import type { PlayHandlers } from "./play-panel.ts";

type Handlers = {
  onReveal: () => void;
  onDontKnow: () => void;
  onKnow: () => void;
  onNext: () => void;
  onNote: (text: string) => void;
  play: PlayHandlers;
};

// Built once and never rebuilt. render() only syncs what state says, so the
// textarea keeps its caret and focus.
export function createFlashcard({ onReveal, onDontKnow, onKnow, onNext, onNote, play }: Handlers) {
  const element = el("section", "card");
  const section = el("span", "section");
  const count = el("span", "count");
  const figure = el("figure", "case");
  const stage = createPlayPanel(play);
  figure.append(stage.element);
  const name = el("p", "name");
  const solution = el("div", "solution");
  const note = el("textarea", "note");
  note.setAttribute("aria-label", "Notes for this case");
  note.placeholder = "Notes";
  note.addEventListener("input", () => onNote(note.value));
  note.addEventListener("keydown", (e) => {
    if (e.key === "Escape") note.blur();
  });

  const reveal = keyedButton("primary", "Reveal", "space", onReveal);
  // Drill's Next shares key 2 with Know it: the same finger, and nothing is graded.
  const grades = [
    keyedButton("", "Don't know", "1", onDontKnow).node,
    keyedButton("", "Know it", "2", onKnow).node,
  ];
  const next = keyedButton("", "Next", "2", onNext).node;
  const actions = el("nav", "actions");
  actions.append(stage.steps, reveal.node, ...grades, next);

  const meta = el("p", "meta");
  meta.append(section, count);
  element.append(meta, figure, name, solution, note, actions);

  let shown: string | null = null;

  function render({ c, revealed, count: position, mode, auf }: CardView, progress: Progress): void {
    // Only these two writes use innerHTML, and both take markup generated in
    // lib from our own case data. The AUF is part of the key: a failed card can
    // come straight back, turned differently.
    const key = `${c.id}|${auf}`;
    if (key !== shown) {
      stage.picture.innerHTML = renderCase(turnState(caseState(c), auf), viewFor(c.mask));
      solution.innerHTML = renderSolution(c, auf);
      section.textContent = `${c.group} · ${c.section}`;
      name.textContent = [c.name, ...c.aliases].filter((s) => s !== null).join(" · ");
      shown = key;
    }

    // Equal while typing, so the caret is not disturbed; different after an
    // import replaced the note underneath.
    const text = progress.notes[c.id] ?? "";
    if (note.value !== text) note.value = text;

    name.hidden = !progress.prefs.showNames || name.textContent === "";
    solution.hidden = !revealed;
    reveal.text.textContent = revealed ? "Hide" : "Reveal";
    count.textContent = position;
    element.dataset.mode = mode;
    for (const grade of grades) grade.hidden = mode === "drill";
    next.hidden = mode === "learn";
  }

  return { element, render, setPlay: stage.show, step: stage.step };
}
