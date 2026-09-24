import { stringify } from "../lib/notation.ts";
import type { Move } from "../lib/notation.ts";
import { el } from "./dom.ts";

// Roughly the space between two moves, in px.
const GAP = 8;

// The solution as one span per move, with a marker standing between moves: at
// the far left before the first, after the last at the end. It says where the
// cube is in the algorithm, which the move about to be played does not, and
// moves over a move as the cube turns it.
export function createAlgStrip() {
  const element = el("div", "alg-strip");
  const marker = el("span", "alg-marker");
  let tokens: HTMLElement[] = [];
  let boundary = 0;

  // Read from the layout, so a wrapped line puts the marker at the start of
  // the next line, where the next move is.
  function pointAt(at: number): { x: number; top: number; height: number } {
    const last = at >= tokens.length;
    const anchor = tokens[last ? tokens.length - 1 : at];
    const before = at > 0 ? tokens[at - 1] : null;
    let x: number;
    if (last) x = anchor.offsetLeft + anchor.offsetWidth + GAP / 2;
    // In the gap between two moves on one line; at the start of a line, just
    // ahead of the move.
    else if (before !== null && before.offsetTop === anchor.offsetTop) x = (before.offsetLeft + before.offsetWidth + anchor.offsetLeft) / 2;
    else x = anchor.offsetLeft - GAP / 2;
    return { x, top: anchor.offsetTop, height: anchor.offsetHeight };
  }

  // A fraction puts the marker part of the way between two boundaries.
  function place(): void {
    marker.hidden = tokens.length === 0;
    if (tokens.length === 0) return;
    const low = Math.floor(boundary);
    const t = boundary - low;
    const a = pointAt(low);
    const b = t === 0 ? a : pointAt(low + 1);
    const mix = (from: number, to: number) => from + (to - from) * t;
    marker.style.left = `${mix(a.x, b.x) - marker.offsetWidth / 2}px`;
    marker.style.top = `${mix(a.top, b.top)}px`;
    marker.style.height = `${mix(a.height, b.height)}px`;
  }

  new ResizeObserver(place).observe(element);

  return {
    element,
    load(moves: readonly Move[]): void {
      tokens = moves.map((move) => el("span", "alg-move", stringify([move])));
      // The spaces are what let a long algorithm wrap.
      element.replaceChildren(marker, ...tokens.flatMap((token) => [token, " "]));
      boundary = 0;
      place();
    },
    // Between boundaries while a move turns, so it travels with the cube.
    setPosition(at: number): void {
      boundary = at;
      place();
    },
  };
}
