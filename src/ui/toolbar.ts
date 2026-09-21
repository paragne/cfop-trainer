import type { CaseSet } from "../data/algorithms.ts";
import type { Progress } from "../lib/progress.ts";
import { el, keyedButton } from "./dom.ts";

type Handlers = {
  sets: readonly CaseSet[];
  onSet: (set: CaseSet) => void;
  onNames: () => void;
  onAutoReveal: () => void;
};

function toggle(label: string, onClick: () => void): HTMLButtonElement {
  const node = el("button", "toggle", label);
  node.type = "button";
  node.addEventListener("click", onClick);
  return node;
}

export function createToolbar({ sets, onSet, onNames, onAutoReveal }: Handlers) {
  const setButtons = new Map(sets.map((set) => [set, toggle(set, () => onSet(set))]));
  const names = keyedButton("toggle", "Names", "n", onNames).node;
  const autoReveal = toggle("Auto-reveal", onAutoReveal);

  const element = el("header", "bar");
  const setBox = el("div", "set-toggles");
  setBox.append(...setButtons.values());
  const prefBox = el("div", "pref-toggles");
  prefBox.append(names, autoReveal);
  element.append(setBox, prefBox);

  return {
    element,
    render({ prefs }: Progress): void {
      for (const [set, button] of setButtons) {
        button.setAttribute("aria-pressed", String(prefs.sets.learn.includes(set)));
      }
      names.setAttribute("aria-pressed", String(prefs.showNames));
      autoReveal.setAttribute("aria-pressed", String(prefs.showSolutions));
    },
  };
}
