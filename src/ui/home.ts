import type { CaseSet } from "../data/algorithms.ts";
import type { Mode } from "../lib/prefs.ts";
import type { SetStats } from "../lib/stats.ts";
import { el, keyedButton, toggleButton } from "./dom.ts";

type Handlers = {
  // Only modes that exist. A mode added to this list gets a button.
  modes: readonly Mode[];
  sets: readonly CaseSet[];
  onMode: (mode: Mode) => void;
  onSet: (set: CaseSet) => void;
  onRotation: () => void;
  onStart: () => void;
};

export type HomeView = {
  mode: Mode;
  selected: readonly CaseSet[];
  rotation: boolean;
  learnDue: number;
  stats: readonly SetStats[];
};

const LABEL: Record<Mode, string> = { learn: "Learn", drill: "Drill", verify: "Verify" };

const percent = (accuracy: number | null) =>
  accuracy === null ? "–" : `${Math.round(accuracy * 100)}%`;

export function createHome({ modes, sets, onMode, onSet, onRotation, onStart }: Handlers) {
  const modeButtons = new Map(modes.map((mode) => [mode, toggleButton(LABEL[mode], () => onMode(mode))]));
  const setButtons = new Map(sets.map((set) => [set, toggleButton(set, () => onSet(set))]));

  const modeBox = el("div", "modes");
  modeBox.setAttribute("role", "group");
  modeBox.setAttribute("aria-label", "Mode");
  modeBox.append(...modeButtons.values());

  const setBox = el("div", "set-toggles");
  setBox.setAttribute("role", "group");
  setBox.setAttribute("aria-label", "Case sets");
  setBox.append(...setButtons.values());

  // Applies to OLL and PLL cards in every mode, so it sits with the session
  // setup and not on the card screens.
  const rotation = toggleButton("Random AUF", onRotation);
  const options = el("div", "options");
  options.append(rotation);

  const head = el("tr", "");
  head.append(...["Set", "Seen", "Accuracy", "Due"].map((text) => el("th", "", text)));
  const body = el("tbody", "");
  const thead = el("thead", "");
  thead.append(head);
  const table = el("table", "stats");
  table.append(thead, body);

  const start = keyedButton("primary", "Start", "space", onStart);
  const startBar = el("div", "start");
  startBar.append(start.node);

  const element = el("main", "home");
  element.append(modeBox, setBox, options, table, startBar);

  return {
    element,
    render({ mode, selected, rotation: randomAuf, learnDue, stats }: HomeView): void {
      for (const [m, button] of modeButtons) {
        button.textContent = m === "learn" ? `${LABEL[m]} · ${learnDue} due` : LABEL[m];
        button.setAttribute("aria-pressed", String(m === mode));
      }
      for (const [set, button] of setButtons) {
        button.setAttribute("aria-pressed", String(selected.includes(set)));
      }
      rotation.setAttribute("aria-pressed", String(randomAuf));
      body.replaceChildren(
        ...stats.map(({ set, seen, total, accuracy, due }) => {
          const row = el("tr", "");
          row.append(
            el("th", "", set),
            el("td", "", `${seen} / ${total}`),
            el("td", "", percent(accuracy)),
            el("td", "", String(due)),
          );
          return row;
        }),
      );
    },
  };
}
