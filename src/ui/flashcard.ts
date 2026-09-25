import { turnState } from "../lib/auf.ts";
import { caseState } from "../lib/case-state.ts";
import type { Progress } from "../lib/progress.ts";
import { renderCase, viewFor } from "../lib/render.ts";
import type { CardView } from "../lib/screen.ts";
import { renderSolution } from "../lib/solution.ts";
import { starredAlg } from "../lib/stars.ts";
import { el, keyedButton, onStarClick } from "./dom.ts";
import { createNotes } from "./notes.ts";
import { createPlayPanel } from "./play-panel.ts";
import type { PlayHandlers } from "./play-panel.ts";

type Handlers = {
  onReveal: () => void;
  onDontKnow: () => void;
  onKnow: () => void;
  onNext: () => void;
  onNote: (text: string) => void;
  onStar: (algIndex: number) => void;
  play: PlayHandlers;
};

// Built once and never rebuilt. render() only syncs what state says, so the
// textarea keeps its caret and focus.
export function createFlashcard({ onReveal, onDontKnow, onKnow, onNext, onNote, onStar, play }: Handlers) {
  const element = el("section", "card");
  const section = el("span", "section");
  const count = el("span", "count");
  const figure = el("figure", "case");
  const stage = createPlayPanel(play);
  figure.append(stage.element);
  const name = el("p", "name");
  const solution = el("div", "solution");
  onStarClick(solution, onStar);
  const notes = createNotes(onNote);

  const reveal = keyedButton("primary", "Reveal", "space / num0", onReveal);
  const dontKnow = keyedButton("", "Don't know", "1 / num3", onDontKnow);
  const know = keyedButton("", "Know it", "2 / num.", onKnow);
  const grades = [dontKnow.node, know.node];
  const next = keyedButton("", "Next", "n / num.", onNext);
  const kbds = [reveal.kbd, dontKnow.kbd, know.kbd, next.kbd];
  const actions = el("nav", "actions");
  actions.append(reveal.node, ...grades, next.node);

  // The title line: the section, then the card's place in the session.
  const title = el("span", "title");
  title.append(section, " · ", count);
  const meta = el("div", "meta");
  meta.append(title);
  // The note shares the name's row, on the right.
  const headline = el("div", "headline");
  headline.append(name, notes.element);
  element.append(headline, meta, figure, solution, actions);

  let shown: string | null = null;
  let solutionHtml = "";
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
      section.textContent = `${c.group} · ${c.section}`;
      name.textContent = [c.name, ...c.aliases].filter((s) => s !== null).join(" · ");
      notes.stop();
      shown = key;
    }

    // Apart from the key: starring an alg rewrites the list, not the picture.
    const html = renderSolution(c, auf, starredAlg(c, progress.stars));
    if (html !== solutionHtml) {
      solution.innerHTML = html;
      solutionHtml = html;
    }

    notes.show(progress.notes[c.id] ?? "", progress.prefs.showNotes);

    name.hidden = !progress.prefs.showNames || name.textContent === "";
    meta.hidden = !progress.prefs.showNames;
    for (const kbd of kbds) kbd.hidden = !progress.prefs.showHotkeys;
    revealed = view.revealed;
    showSolution();
    reveal.text.textContent = view.revealed ? "Hide" : "Reveal";
    count.textContent = position;
    element.dataset.mode = mode;
    // A gallery card only browses: nothing to reveal, grade or advance.
    actions.hidden = mode === "gallery";
    for (const grade of grades) grade.hidden = mode !== "learn";
    next.node.hidden = mode !== "drill";
  }

  return {
    element,
    render,
    setPlay(...args: Parameters<typeof stage.show>): void {
      threeD = stage.show(...args);
      showSolution();
    },
    step: stage.step,
    editNote: notes.edit,
  };
}
