import type { Case } from "../data/algorithms.ts";
import { prefixed } from "../lib/auf.ts";
import type { Auf } from "../lib/auf.ts";
import { el, squareButton } from "./dom.ts";
import { ALG_LIST_ICON } from "./icons.ts";

// The case's algorithms behind a button, out of the way until asked for and
// gone again on a pick, a click elsewhere or Escape, like the speed grid. A
// row's text picks what the 3D view animates; its star makes that alg the
// case's default. Not a dialog: nothing else on the page is blocked.
export function createAlgPicker(onChoose: (algIndex: number) => void, onStar: (algIndex: number) => void) {
  const list = el("div", "alg-list");
  const popover = el("div", "speed-pop alg-pop");
  popover.hidden = true;
  popover.append(el("span", "speed-title", "Algorithm"), list);

  const button = squareButton("Choose algorithm", ALG_LIST_ICON, () => setOpen(!open));
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
    // Only worth a button with something to pick from, and once the solution is
    // there to animate. Rebuilt on every call, so the rows always say which alg
    // is animating and which is starred.
    sync(shown: boolean, c: Case, auf: Auf, chosen: number, starred: number): void {
      const offered = shown && c.algs.length > 1;
      button.hidden = !offered;
      if (!offered) setOpen(false);
      list.replaceChildren(
        ...c.algs.map((alg, i) => {
          const choice = el("button", "toggle alg-choice", prefixed(auf, alg.display));
          choice.type = "button";
          choice.setAttribute("aria-pressed", String(i === chosen));
          choice.addEventListener("click", () => {
            onChoose(i);
            setOpen(false);
          });
          const star = el("button", "alg-star", i === starred ? "★" : "☆");
          star.type = "button";
          star.setAttribute("aria-pressed", String(i === starred));
          star.setAttribute("aria-label", "Star this algorithm");
          star.addEventListener("click", () => onStar(i));
          const row = el("div", "alg-row");
          row.append(choice, star);
          return row;
        }),
      );
    },
  };
}
