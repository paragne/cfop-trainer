import type { Progress } from "../lib/progress.ts";
import { el, keyedButton, toggleButton } from "./dom.ts";

type Handlers = {
  onNames: () => void;
  onAutoReveal: () => void;
  onNotes: () => void;
  onHotkeys: () => void;
  // A touch-primary device has no keyboard to label, so the toggle never
  // shows there, regardless of the stored pref.
  touchPrimary: boolean;
};

// Card behavior, not session setup, so it lives on the card screens and the
// home screen carries only what a session is made of.
export function createPrefBar({ onNames, onAutoReveal, onNotes, onHotkeys, touchPrimary }: Handlers) {
  const names = keyedButton("toggle", "Names", "n", onNames).node;
  const autoReveal = toggleButton("Auto-reveal", onAutoReveal);
  const notes = toggleButton("Notes", onNotes);
  const hotkeys = toggleButton("Hotkeys", onHotkeys);
  hotkeys.hidden = touchPrimary;
  const element = el("div", "prefs");
  element.append(names, autoReveal, notes, hotkeys);

  return {
    element,
    render({ prefs }: Progress): void {
      names.setAttribute("aria-pressed", String(prefs.showNames));
      autoReveal.setAttribute("aria-pressed", String(prefs.showSolutions));
      notes.setAttribute("aria-pressed", String(prefs.showNotes));
      hotkeys.setAttribute("aria-pressed", String(prefs.showHotkeys));
      // Verify has no per-card solution reveal, since the algorithm only
      // appears after a Mismatch.
      autoReveal.hidden = prefs.mode === "verify";
    },
  };
}
