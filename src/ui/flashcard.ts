import { turnState } from "../lib/auf.ts";
import { caseState } from "../lib/case-state.ts";
import type { Progress } from "../lib/progress.ts";
import { renderCase, viewFor } from "../lib/render.ts";
import type { CardView } from "../lib/screen.ts";
import { renderSolution } from "../lib/solution.ts";
import { el, keyedButton } from "./dom.ts";
import { createNotes } from "./notes.ts";
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
  const notes = createNotes(onNote);

  const reveal = keyedButton("primary", "Reveal", "space", onReveal);
  // Drill's Next shares key 2 with Know it: the same finger, and nothing is graded.
  const grades = [
    keyedButton("", "Don't know", "1", onDontKnow).node,
    keyedButton("", "Know it", "2", onKnow).node,
  ];
  const next = keyedButton("", "Next", "2", onNext).node;
  const actions = el("nav", "actions");
  actions.append(reveal.node, ...grades, next);

  // The note sits under the section line, top left; its button by the count.
  const side = el("span", "meta-side");
  side.append(count, notes.button);
  const meta = el("div", "meta");
  meta.append(section, side, ...notes.body);
  element.append(meta, figure, name, solution, actions);

  let shown: string | null = null;
  let revealed = false;
  let threeD = false;

  // The 3D view writes the solution out itself, so this copy would only repeat it.
  const showSolution = () => {
    solution.hidden = !revealed || threeD;
  };

  function render(view: CardView, progress: Progress): void {
    const { c, count: position, mode, auf } = view;
    // Only these two writes use innerHTML, and both take markup generated in
    // lib from our own case data. The AUF is part of the key: a failed card can
    // come straight back, turned differently.
    const key = `${c.id}|${auf}`;
    if (key !== shown) {
      stage.picture.innerHTML = renderCase(turnState(caseState(c), auf), viewFor(c.mask));
      solution.innerHTML = renderSolution(c, auf);
      section.textContent = `${c.group} · ${c.section}`;
      name.textContent = [c.name, ...c.aliases].filter((s) => s !== null).join(" · ");
      notes.stop();
      shown = key;
    }

    notes.show(progress.notes[c.id] ?? "");

    name.hidden = !progress.prefs.showNames || name.textContent === "";
    revealed = view.revealed;
    showSolution();
    reveal.text.textContent = view.revealed ? "Hide" : "Reveal";
    count.textContent = position;
    element.dataset.mode = mode;
    for (const grade of grades) grade.hidden = mode === "drill";
    next.hidden = mode === "learn";
  }

  return {
    element,
    render,
    setPlay(...args: Parameters<typeof stage.show>): void {
      threeD = stage.show(...args);
      showSolution();
    },
    step: stage.step,
  };
}
