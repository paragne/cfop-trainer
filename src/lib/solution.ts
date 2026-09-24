import type { Case } from "../data/algorithms.ts";
import { prefixed } from "./auf.ts";
import type { Auf } from "./auf.ts";

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

// Every string is escaped, including videoUrl inside its attribute, so the
// caller can assign the result with innerHTML.
const escape = (text: string) => text.replace(/[&<>"]/g, (ch) => ESCAPES[ch]);

// Such an alg can leave another slot unsolved, which matters mid-solve.
const FLAG = '<span class="alg-flag" title="Affects more than one slot">multi-slot</span>';

export function renderSolution(c: Case, auf: Auf): string {
  const [primary, ...alternates] = c.algs;
  const algs = [
    `<p class="alg primary">${escape(prefixed(auf, primary.display))}</p>`,
    ...alternates.map(
      (alg) => `<p class="alg alt">${escape(prefixed(auf, alg.display))}${alg.affectsOtherSlots === true ? ` ${FLAG}` : ""}</p>`,
    ),
  ].join("");
  if (c.videoUrl === null) return algs;
  const link = `<a class="video" href="${escape(c.videoUrl)}" target="_blank" rel="noopener noreferrer">J Perm video</a>`;
  return algs + link;
}
