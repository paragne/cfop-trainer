import { el } from "../dom.ts";
import type { ViewFaces } from "../../lib/view-faces.ts";

// A little cube with three faces showing: what the screen is looking at, in
// the letters an algorithm uses. Constant markup; the letters are set after.
const CUBE =
  '<svg viewBox="0 0 60 60" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M30 6L54 18L30 30L6 18Z"/><path d="M6 18L30 30V56L6 44Z"/><path d="M30 30L54 18V44L30 56Z"/>' +
  '<g fill="currentColor" stroke="none" font-size="13" text-anchor="middle" dominant-baseline="central">' +
  '<text x="30" y="18"></text><text x="18" y="38"></text><text x="42" y="38"></text></g></svg>';

export function createLegend() {
  const element = el("div", "legend");
  element.setAttribute("role", "img");
  element.innerHTML = CUBE;
  const [top, left, right] = Array.from(element.querySelectorAll("text"));

  return {
    element,
    // Null hides it: only the front-right and front-left views have a fixed
    // reading, and an orbiting camera has none.
    update(faces: ViewFaces | null): void {
      element.hidden = faces === null;
      if (faces === null) return;
      top.textContent = faces.top;
      left.textContent = faces.left;
      right.textContent = faces.right;
      element.setAttribute("aria-label", `Top ${faces.top}, left ${faces.left}, right ${faces.right}`);
    },
  };
}
