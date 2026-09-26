import type { Progress } from "../lib/progress.ts";
import { el, keyedButton, toggleButton } from "./dom.ts";

type Handlers = {
  onNames: () => void;
  onAutoReveal: () => void;
  onNotes: () => void;
  onHotkeys: () => void;
  onAllStickers: () => void;
  // A touch-primary device has no keyboard to label, so the toggle never
  // shows there, regardless of the stored pref.
  touchPrimary: boolean;
};

// Card behavior, not session setup, so it lives on the card screens and the
// home screen carries only what a session is made of.
export function createPrefBar({ onNames, onAutoReveal, onNotes, onHotkeys, onAllStickers, touchPrimary }: Handlers) {
  const names = keyedButton("toggle", "Names", "n", onNames).node;
  const autoReveal = toggleButton("Auto-reveal", onAutoReveal);
  const notes = toggleButton("Notes", onNotes);
  const hotkeys = toggleButton("Hotkeys", onHotkeys);
  const allStickers = toggleButton("All stickers", onAllStickers);
  hotkeys.hidden = touchPrimary;
  const element = el("div", "prefs");
  element.append(names, autoReveal, notes, allStickers, hotkeys);

  return {
    element,
    render({ prefs }: Progress): void {
      names.setAttribute("aria-pressed", String(prefs.showNames));
      autoReveal.setAttribute("aria-pressed", String(prefs.showSolutions));
      notes.setAttribute("aria-pressed", String(prefs.showNotes));
      hotkeys.setAttribute("aria-pressed", String(prefs.showHotkeys));
      allStickers.setAttribute("aria-pressed", String(prefs.crossAllStickers));
      // Cross has no case to name or note and nothing to auto-reveal; the
      // sticker toggle is the one card setting it adds.
      const crossing = prefs.mode === "cross";
      names.hidden = crossing;
      notes.hidden = crossing;
      allStickers.hidden = !crossing;
      // Verify has no per-card solution reveal, since the algorithm only
      // appears after a Mismatch, and a gallery card always shows it.
      autoReveal.hidden = prefs.mode === "verify" || prefs.mode === "gallery" || crossing;
    },
  };
}
