import { AESTHETICS, PROFILES } from "../lib/aesthetic.ts";
import type { Aesthetic } from "../lib/aesthetic.ts";
import { el, squareButton } from "./dom.ts";
import { AESTHETIC_ICON } from "./icons.ts";

// How the 3D cube looks, behind a button like the speed grid's: out of the way
// until asked for, gone again on a pick, a click elsewhere or Escape. Not a
// dialog: nothing else on the page is blocked while it is open.
export function createAestheticPop(onPick: (aesthetic: Aesthetic) => void) {
  const options = new Map(
    AESTHETICS.map((aesthetic) => {
      const option = el("button", "toggle alg-choice", PROFILES[aesthetic].label);
      option.type = "button";
      option.addEventListener("click", () => {
        onPick(aesthetic);
        setOpen(false);
      });
      return [aesthetic, option];
    }),
  );
  const popover = el("div", "speed-pop");
  popover.hidden = true;
  popover.append(el("span", "speed-title", "Cube Style"), ...options.values());

  const button = squareButton("Cube style", AESTHETIC_ICON, () => setOpen(!open));
  button.setAttribute("aria-expanded", "false");

  let open = false;
  function setOpen(next: boolean): void {
    open = next;
    popover.hidden = !next;
    button.setAttribute("aria-expanded", String(next));
  }
  document.addEventListener("pointerdown", (e) => {
    if (e.target instanceof Node && !popover.contains(e.target) && !button.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });

  return {
    button,
    popover,
    close: () => setOpen(false),
    setValue(aesthetic: Aesthetic): void {
      for (const [a, option] of options) option.setAttribute("aria-pressed", String(a === aesthetic));
    },
  };
}
