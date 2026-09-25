import { el } from "../dom.ts";
import type { ViewFaces } from "../../lib/view-faces.ts";

// A little cube with three faces showing: what the screen is looking at, in
// the letters an algorithm uses. Constant markup; the letters are set after.
// The rhombi are the true isometric projection (30 degrees off horizontal,
// the same eye = [1,1,1] basis the cube renderer and 3D camera use), not the
// 2:1 pixel-art approximation this used to draw.
const CUBE =
  '<svg viewBox="0 0 60 60" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M30 2.2L54 16.1L30 30L6 16.1Z"/><path d="M6 16.1L30 30V57.8L6 43.9Z"/><path d="M30 30L54 16.1V43.9L30 57.8Z"/>' +
  '<g fill="currentColor" stroke="none" font-size="14" font-weight="700" text-anchor="middle" dominant-baseline="central">' +
  '<text x="30" y="16"></text><text x="18" y="37"></text><text x="42" y="37"></text></g></svg>';

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
