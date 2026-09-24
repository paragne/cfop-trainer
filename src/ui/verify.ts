import { prefixed, turnState } from "../lib/auf.ts";
import { caseState } from "../lib/case-state.ts";
import type { Progress } from "../lib/progress.ts";
import { renderCase, viewFor } from "../lib/render.ts";
import { renderSolution } from "../lib/solution.ts";
import { choices, expected, regrip } from "../lib/verify.ts";
import type { Verify } from "../lib/verify.ts";
import { el, keyedButton, toggleButton } from "./dom.ts";
import { createPlayPanel } from "./play-panel.ts";
import type { PlayHandlers } from "./play-panel.ts";

type Handlers = {
  onPrimary: () => void;
  onMismatch: () => void;
  onMatch: () => void;
  onChoose: (i: number) => void;
  play: PlayHandlers;
};

// Built once, like flashcard: render() only syncs what the phase says.
export function createVerify({ onPrimary, onMismatch, onMatch, onChoose, play }: Handlers) {
  const element = el("section", "card verify");
  const count = el("p", "meta");
  const ready = el("p", "hint", "Hold a solved cube yellow up, green front.");
  const figure = el("figure", "case");
  const stage = createPlayPanel(play);
  figure.append(stage.element);
  const name = el("p", "name");
  const solution = el("div", "solution");
  const altLabel = el("p", "hint", "Expected if you used:");
  const altPicker = el("div", "set-toggles");
  altPicker.setAttribute("role", "group");
  altPicker.setAttribute("aria-label", "Expected if you used");
  const regripLine = el("p", "hint");

  const primary = keyedButton("primary", "Begin", "space", onPrimary);
  const mismatch = keyedButton("", "Mismatch", "1", onMismatch);
  const match = keyedButton("", "Match", "2", onMatch);
  const actions = el("nav", "actions");
  actions.append(primary.node, mismatch.node, match.node);

  element.append(count, ready, figure, name, solution, altLabel, altPicker, regripLine, actions);

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

  // The 3D view writes the solution out itself, so this copy would only repeat it.
  const showSolution = () => {
    solution.hidden = !missed || threeD;
  };

  function render(v: Verify, progress: Progress): void {
    count.textContent = `Verify · ${v.step} / ${v.length}`;
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

    primary.text.textContent =
      v.phase === "attempt" ? "Check" : v.phase === "missed" ? (v.step === v.length ? "Finish" : "Reset") : "Begin";
    primary.node.hidden = v.phase === "checked";
    mismatch.node.hidden = v.phase !== "checked";
    match.node.hidden = v.phase !== "checked";
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
