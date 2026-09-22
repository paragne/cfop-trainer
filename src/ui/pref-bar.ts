import type { Progress } from "../lib/progress.ts";
import { el, keyedButton, toggleButton } from "./dom.ts";

type Handlers = {
  onNames: () => void;
  onAutoReveal: () => void;
};

// Card behavior, not session setup, so it lives on the card screens and the
// home screen carries only what a session is made of.
export function createPrefBar({ onNames, onAutoReveal }: Handlers) {
  const names = keyedButton("toggle", "Names", "n", onNames).node;
  const autoReveal = toggleButton("Auto-reveal", onAutoReveal);
  const element = el("div", "prefs");
  element.append(names, autoReveal);

  return {
    element,
    render({ prefs }: Progress): void {
      names.setAttribute("aria-pressed", String(prefs.showNames));
      autoReveal.setAttribute("aria-pressed", String(prefs.showSolutions));
      // Verify has no per-card solution reveal: the algorithm only appears
      // after a Mismatch.
      autoReveal.hidden = prefs.mode === "verify";
    },
  };
}
