import { ALL_CASES } from "../data/algorithms.ts";
import type { Case } from "../data/algorithms.ts";
import { caseState } from "../lib/case-state.ts";
import { renderCase, viewFor } from "../lib/render.ts";

const title = (c: Case) => `${c.group} · ${c.section}`;

function figure(c: Case): HTMLElement {
  const fig = document.createElement("figure");
  fig.insertAdjacentHTML("beforeend", renderCase(caseState(c), viewFor(c.mask)));
  const id = document.createElement("code");
  id.textContent = c.id;
  const alg = document.createElement("div");
  alg.className = "alg";
  alg.textContent = c.algs[0].display;
  const sets = document.createElement("div");
  sets.className = "sets";
  sets.textContent = c.sets.join(" · ");
  fig.append(id, alg, sets);
  return fig;
}

const heading = document.createElement("h1");
heading.textContent = `Contact sheet: ${ALL_CASES.length} cases`;
document.body.append(heading);

for (const section of new Set(ALL_CASES.map(title))) {
  const cases = ALL_CASES.filter((c) => title(c) === section);
  const label = document.createElement("h2");
  label.textContent = `${section} (${cases.length})`;
  const grid = document.createElement("div");
  grid.className = "grid";
  grid.append(...cases.map(figure));
  document.body.append(label, grid);
}
