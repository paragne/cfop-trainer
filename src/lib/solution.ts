import type { Case } from "../data/algorithms.ts";
import { prefixed } from "./auf.ts";
import type { Auf } from "./auf.ts";

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

// Every string is escaped, including videoUrl inside its attribute, so the
// caller can assign the result with innerHTML.
const escape = (text: string) => text.replace(/[&<>"]/g, (ch) => ESCAPES[ch]);

// Such an alg can leave another slot unsolved, which matters mid-solve.
const FLAG = '<span class="alg-flag" title="Affects more than one slot">multi-slot</span>';

// One per alg, read back by the caller from data-alg-star. Filled when it is
// the starred one; aria-pressed carries the same state for a screen reader.
const star = (i: number, starred: number) =>
  `<button type="button" class="alg-star" data-alg-star="${i}" aria-pressed="${i === starred}" aria-label="Star this algorithm">${i === starred ? "★" : "☆"}</button>`;

export function renderSolution(c: Case, auf: Auf, starred: number): string {
  const [primary, ...alternates] = c.algs;
  const algs = [
    `<p class="alg primary">${star(0, starred)}${escape(prefixed(auf, primary.display))}</p>`,
    ...alternates.map(
      (alg, k) =>
        `<p class="alg alt">${star(k + 1, starred)}${escape(prefixed(auf, alg.display))}${alg.affectsOtherSlots === true ? ` ${FLAG}` : ""}</p>`,
    ),
  ].join("");
  if (c.videoUrl === null) return algs;
  const link = `<a class="video" href="${escape(c.videoUrl)}" target="_blank" rel="noopener noreferrer">J Perm video</a>`;
  return algs + link;
}
