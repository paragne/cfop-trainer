import { caseState } from "../lib/case-state.ts";
import type { Progress } from "../lib/progress.ts";
import { renderCase, viewFor } from "../lib/render.ts";
import { current } from "../lib/session.ts";
import type { Session } from "../lib/session.ts";
import { renderSolution } from "../lib/solution.ts";
import { el, keyedButton } from "./dom.ts";

type Handlers = {
  onReveal: () => void;
  onDontKnow: () => void;
  onKnow: () => void;
  onNote: (text: string) => void;
};

// Built once and never rebuilt. render() only syncs what state says, so the
// textarea keeps its caret and focus.
export function createFlashcard({ onReveal, onDontKnow, onKnow, onNote }: Handlers) {
  const element = el("section", "card");
  const section = el("span", "section");
  const count = el("span", "count");
  const figure = el("figure", "case");
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
  const actions = el("nav", "actions");
  actions.append(
    reveal.node,
    keyedButton("", "Don't know", "1", onDontKnow).node,
    keyedButton("", "Know it", "2", onKnow).node,
  );

  const meta = el("p", "meta");
  meta.append(section, count);
  element.append(meta, figure, name, solution, note, actions);

  let shown: string | null = null;

  function render(session: Session, progress: Progress): void {
    const c = current(session);
    if (c === null) throw new Error("flashcard rendered without a current case");

    // Only these two writes use innerHTML, and both take markup generated in
    // lib from our own case data.
    if (c.id !== shown) {
      figure.innerHTML = renderCase(caseState(c), viewFor(c.mask));
      solution.innerHTML = renderSolution(c);
      section.textContent = `${c.group} · ${c.section}`;
      name.textContent = [c.name, ...c.aliases].filter((s) => s !== null).join(" · ");
      shown = c.id;
    }

    // Equal while typing, so the caret is not disturbed; different after an
    // import replaced the note underneath.
    const text = progress.notes[c.id] ?? "";
    if (note.value !== text) note.value = text;

    name.hidden = !progress.prefs.showNames || name.textContent === "";
    solution.hidden = !session.revealed;
    reveal.text.textContent = session.revealed ? "Hide" : "Reveal";
    count.textContent = `${session.done} / ${session.total}`;
  }

  return { element, render };
}
