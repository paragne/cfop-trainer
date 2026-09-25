import { prefixed, turnState } from "../lib/auf.ts";
import { caseState } from "../lib/case-state.ts";
import type { Progress } from "../lib/progress.ts";
import { renderCase, viewFor } from "../lib/render.ts";
import { renderSolution } from "../lib/solution.ts";
import { choices, expected, regrip } from "../lib/verify.ts";
import type { Verify } from "../lib/verify.ts";
import { checkboxLabel, el, keyedButton, toggleButton } from "./dom.ts";
import { createNotes } from "./notes.ts";
import { createPlayPanel } from "./play-panel.ts";
import type { PlayHandlers } from "./play-panel.ts";

type Handlers = {
  onPrimary: () => void;
  onMismatch: () => void;
  onMatch: () => void;
  onChoose: (i: number) => void;
  onNote: (text: string) => void;
  onRestart: () => void;
  onHome: () => void;
  onSkipIntro: (skip: boolean) => void;
  play: PlayHandlers;
};

// Shown before the first step, in place of the case. Static text: nothing
// here is built from user input.
const READY_COPY: readonly string[] = [
  "Hold a solved cube, yellow up, green front.",
  "You execute each case's algorithm on your physical cube from whatever state it is already in. It will not look like the pictured case: the check is on the result, not the setup.",
  "Press Check to reveal the expected result. If Random AUF is on, first make the U turns needed to line the case up as shown, then execute the algorithm.",
  "Answer Match or Mismatch. Mismatch shows the correct algorithm(s) and a Reset once you have fixed the cube by hand.",
  "The header only tallies your step count and matches. Nothing here is scheduled or saved to your cards.",
];

// Built once, like flashcard: render() only syncs what the phase says.
export function createVerify({ onPrimary, onMismatch, onMatch, onChoose, onNote, onRestart, onHome, onSkipIntro, play }: Handlers) {
  const element = el("section", "card verify");
  const count = el("p", "meta");
  const ready = el("div", "intro-body");
  ready.append(...READY_COPY.map((text) => el("p", "hint", text)));
  const figure = el("figure", "case");
  const stage = createPlayPanel(play);
  figure.append(stage.element);
  const name = el("p", "name");
  const notes = createNotes(onNote);
  const headline = el("div", "headline");
  headline.append(name, notes.element);
  const solution = el("div", "solution");
  const altLabel = el("p", "hint", "Expected if you used:");
  const altPicker = el("div", "set-toggles");
  altPicker.setAttribute("role", "group");
  altPicker.setAttribute("aria-label", "Expected if you used");
  const regripLine = el("p", "hint");

  const primary = keyedButton("primary", "Begin", "space / num0", onPrimary);
  const mismatch = keyedButton("", "Mismatch", "1 / num3", onMismatch);
  const match = keyedButton("", "Match", "2 / num.", onMatch);
  const kbds = [primary.kbd, mismatch.kbd, match.kbd];
  const skipIntro = checkboxLabel("Don't show this again", onSkipIntro);
  // Only shown after a Mismatch: the streak is over, so the user is offered a
  // way out on top of Reset, which keeps the same session going.
  const restart = el("button", "quiet", "Start another session");
  restart.type = "button";
  restart.addEventListener("click", onRestart);
  const home = el("button", "quiet", "Return Home");
  home.type = "button";
  home.addEventListener("click", onHome);
  const actions = el("nav", "actions");
  actions.append(skipIntro.label, primary.node, mismatch.node, match.node, restart, home);

  element.append(headline, count, ready, figure, solution, altLabel, altPicker, regripLine, actions);

  function renderAlts(v: Verify): void {
    const indices = choices(v);
    altLabel.hidden = indices.length === 0;
    altPicker.hidden = indices.length === 0;
    altPicker.replaceChildren(
      ...indices.map((i) => {
        const button = toggleButton(prefixed(v.auf, v.current.algs[i].display), () => onChoose(i));
        button.setAttribute("aria-pressed", String(i === v.chosen));
        return button;
      }),
    );
  }

  let missed = false;
  let threeD = false;
  let shownCase: string | null = null;

  // The 3D view writes the solution out itself, so this copy would only repeat it.
  const showSolution = () => {
    solution.hidden = !missed || threeD;
  };

  function render(v: Verify, progress: Progress): void {
    count.textContent = `Verify · step ${v.step} · ${v.matches} matched`;
    ready.hidden = v.phase !== "ready";

    const attempting = v.phase === "attempt";
    const showsExpected = v.phase === "checked" || v.phase === "missed";
    figure.hidden = v.phase === "ready";
    if (attempting) {
      stage.picture.innerHTML = renderCase(turnState(caseState(v.current), v.auf), viewFor(v.current.mask));
    } else if (showsExpected) {
      // No mask and never normalized: exactly the physical cube as held,
      // including any net rotation an algorithm like oll-42 leaves behind.
      stage.picture.innerHTML = renderCase(expected(v), "top");
    }

    name.hidden = v.phase === "ready" || !progress.prefs.showNames;
    name.textContent = [v.current.name, ...v.current.aliases].filter((s) => s !== null).join(" · ");
    if (v.current.id !== shownCase) {
      notes.stop();
      shownCase = v.current.id;
    }
    notes.show(progress.notes[v.current.id] ?? "", progress.prefs.showNotes);
    for (const kbd of kbds) kbd.hidden = !progress.prefs.showHotkeys;
    skipIntro.label.hidden = v.phase !== "ready";
    skipIntro.input.checked = progress.prefs.skipVerifyIntro;

    missed = v.phase === "missed";
    showSolution();
    if (v.phase === "missed") solution.innerHTML = renderSolution(v.current, v.auf);

    if (v.phase === "checked") renderAlts(v);
    else {
      altLabel.hidden = true;
      altPicker.hidden = true;
    }

    const rotation = v.phase === "checked" ? regrip(expected(v)) : [];
    regripLine.hidden = rotation.length === 0;
    if (rotation.length > 0) {
      regripLine.textContent = `Your grip has turned. Rotate ${rotation.join(" then ")} to hold it green front, yellow up, then compare.`;
    }

    primary.text.textContent = v.phase === "attempt" ? "Check" : v.phase === "missed" ? "Reset" : "Begin";
    primary.node.hidden = v.phase === "checked";
    mismatch.node.hidden = v.phase !== "checked";
    match.node.hidden = v.phase !== "checked";
    restart.hidden = v.phase !== "missed";
    home.hidden = v.phase !== "missed";
    actions.classList.toggle("paired", v.phase === "checked" || v.phase === "missed");
    actions.classList.toggle("confirm-row", v.phase === "ready");
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
