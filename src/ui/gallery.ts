import type { Case } from "../data/algorithms.ts";
import { caseState } from "../lib/case-state.ts";
import { renderCase, viewFor } from "../lib/render.ts";
import { el } from "./dom.ts";

// The grid is built once per Start and only hidden while a case is open, so
// the page can come back to the scroll position it was left at.
export function createGallery(onOpen: (c: Case) => void) {
  const element = el("main", "gallery");
  element.hidden = true;

  let builtFor = "";
  let wasOpen = false;
  let scrollY = 0;

  function cell(c: Case): HTMLButtonElement {
    const label = c.name ?? c.section;
    const button = el("button", "gallery-cell");
    button.type = "button";
    button.setAttribute("aria-label", label);
    // Markup generated in lib from our own case data.
    button.innerHTML = renderCase(caseState(c), viewFor(c.mask));
    button.append(el("span", "gallery-name", label));
    button.addEventListener("click", () => onOpen(c));
    return button;
  }

  function build(sections: ReadonlyMap<string, readonly Case[]>): void {
    element.replaceChildren(
      ...[...sections].flatMap(([title, cases]) => {
        const grid = el("div", "gallery-grid");
        grid.append(...cases.map(cell));
        return [el("h2", "gallery-title", `${title} (${cases.length})`), grid];
      }),
    );
  }

  return {
    element,
    // `sections` is null off the gallery screen and `open` is the case whose
    // card is up. The scroll is read before the grid hides, and put back after
    // it shows.
    render(sections: ReadonlyMap<string, readonly Case[]> | null, open: Case | null): void {
      if (sections === null) {
        element.hidden = true;
        builtFor = "";
        wasOpen = false;
        return;
      }
      const key = [...sections.values()].flatMap((cases) => cases.map((c) => c.id)).join();
      const isOpen = open !== null;
      if (key !== builtFor) {
        build(sections);
        builtFor = key;
        scrollY = 0;
        // A fresh grid is treated as returning from a card, at the top.
        wasOpen = true;
      }
      if (isOpen && !wasOpen) scrollY = window.scrollY;
      element.hidden = isOpen;
      if (isOpen !== wasOpen) window.scrollTo(0, isOpen ? 0 : scrollY);
      wasOpen = isOpen;
    },
  };
}
