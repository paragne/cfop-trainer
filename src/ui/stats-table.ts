import type { PaceRow } from "../lib/timed-stats.ts";
import { el } from "./dom.ts";

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const percent = (n: number) => `${Math.round(n * 100)}%`;

// One row's case is named the way the rest of the app names it: its own name
// where it has one, its section otherwise (most F2L cases, until Phase 8).
const label = (row: PaceRow) => row.case.name ?? row.case.section;

// A per-case pace table for the home dashboard's Drill and Verify sections.
// Hidden entirely, section and all, when nothing yet meets the attempt
// threshold: an empty table would just be noise on a first visit.
export function createStatsTable(heading: string) {
  const element = el("div", "stat-table");
  const title = el("h3", "stat-table-title", heading);
  const rows = el("div", "stat-table-rows");
  element.append(title, rows);

  return {
    element,
    render(data: readonly PaceRow[]): void {
      element.hidden = data.length === 0;
      rows.replaceChildren(
        ...data.map((row) => {
          const metrics = [
            row.accuracy === null ? null : percent(row.accuracy),
            row.bestMs === null ? null : `best ${seconds(row.bestMs)}`,
            `${row.secondsPerMove.toFixed(1)}s/move`,
          ].filter((m) => m !== null);
          const node = el("div", "stat-table-row");
          node.append(el("span", "stat-table-name", label(row)), el("span", "stat-table-numbers", metrics.join(" · ")));
          return node;
        }),
      );
    },
  };
}
