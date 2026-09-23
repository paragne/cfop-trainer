/**
 * Renders a case's algorithm as one span per move, with step mode's current
 * index highlighted. Reads the parsed Move list directly rather than a
 * case's `display` string, since display's parenthetical/repeat shorthand
 * ((R U R' U')*3) has no 1:1 mapping onto individual animated moves.
 */
import { stringify } from "../../lib/notation.ts";
import type { Move } from "../../lib/notation.ts";

export function renderAlg(container: HTMLElement, moves: readonly Move[], currentIndex: number): void {
  container.replaceChildren(
    ...moves.map((move, i) => {
      const span = document.createElement("span");
      span.textContent = stringify([move]);
      span.className = i === currentIndex ? "alg-move current" : "alg-move";
      return span;
    }),
  );
}
