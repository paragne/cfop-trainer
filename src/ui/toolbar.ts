import type { Group } from "../data/algorithms.ts";
import type { Progress } from "../lib/progress.ts";
import { el, keyedButton } from "./dom.ts";

type Handlers = {
  groups: readonly Group[];
  onGroup: (group: Group) => void;
  onNames: () => void;
  onAutoReveal: () => void;
};

function toggle(label: string, onClick: () => void): HTMLButtonElement {
  const node = el("button", "toggle", label);
  node.type = "button";
  node.addEventListener("click", onClick);
  return node;
}

export function createToolbar({ groups, onGroup, onNames, onAutoReveal }: Handlers) {
  const groupButtons = new Map(groups.map((g) => [g, toggle(g, () => onGroup(g))]));
  const names = keyedButton("toggle", "Names", "n", onNames).node;
  const autoReveal = toggle("Auto-reveal", onAutoReveal);

  const element = el("header", "bar");
  const groupBox = el("div", "group-toggles");
  groupBox.append(...groupButtons.values());
  const prefBox = el("div", "pref-toggles");
  prefBox.append(names, autoReveal);
  element.append(groupBox, prefBox);

  return {
    element,
    render({ prefs }: Progress): void {
      for (const [group, button] of groupButtons) {
        button.setAttribute("aria-pressed", String(prefs.groups.includes(group)));
      }
      names.setAttribute("aria-pressed", String(prefs.showNames));
      autoReveal.setAttribute("aria-pressed", String(prefs.showSolutions));
    },
  };
}
