import { stringify } from "../lib/notation.ts";
import type { Move } from "../lib/notation.ts";
import { el } from "./dom.ts";

// Roughly the space between two moves, in px.
const GAP = 8;

// The solution as one span per move, with a marker standing between moves: at
// the far left before the first, after the last at the end. It says where the
// cube is in the algorithm, which the move about to be played does not.
export function createAlgStrip() {
  const element = el("div", "alg-strip");
  const marker = el("span", "alg-marker");
  let tokens: HTMLElement[] = [];
  let boundary = 0;

  // Read from the layout, so a wrapped line puts the marker at the start of
  // the next line, where the next move is.
  function place(ms: number): void {
    marker.hidden = tokens.length === 0;
    if (tokens.length === 0) return;
    const last = boundary >= tokens.length;
    const anchor = tokens[last ? tokens.length - 1 : boundary];
    const before = boundary > 0 ? tokens[boundary - 1] : null;
    let x: number;
    if (last) x = anchor.offsetLeft + anchor.offsetWidth + GAP / 2;
    // In the gap between two moves on one line; at the start of a line, just
    // ahead of the move.
    else if (before !== null && before.offsetTop === anchor.offsetTop) x = (before.offsetLeft + before.offsetWidth + anchor.offsetLeft) / 2;
    else x = anchor.offsetLeft - GAP / 2;
    marker.style.transitionDuration = `${ms}ms`;
    marker.style.left = `${x - marker.offsetWidth / 2}px`;
    marker.style.top = `${anchor.offsetTop}px`;
    marker.style.height = `${anchor.offsetHeight}px`;
  }

  new ResizeObserver(() => place(0)).observe(element);

  return {
    element,
    load(moves: readonly Move[]): void {
      tokens = moves.map((move) => el("span", "alg-move", stringify([move])));
      // The spaces are what let a long algorithm wrap.
      element.replaceChildren(marker, ...tokens.flatMap((token) => [token, " "]));
      boundary = 0;
      place(0);
    },
    // Slides to a boundary over `ms`, as the cube turns.
    travel(to: number, ms: number): void {
      boundary = to;
      place(ms);
    },
    settle(at: number): void {
      boundary = at;
      place(0);
    },
  };
}
