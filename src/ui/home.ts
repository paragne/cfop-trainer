import { SET_GROUP } from "../data/algorithms.ts";
import type { CaseSet } from "../data/algorithms.ts";
import type { Mode } from "../lib/prefs.ts";
import { tickStates } from "../lib/stats.ts";
import type { SetStats } from "../lib/stats.ts";
import { el, keyedButton, toggleButton } from "./dom.ts";
import { SHUFFLE_ICON } from "./icons.ts";

type Handlers = {
  // Only modes that exist. A mode added to this list gets a button.
  modes: readonly Mode[];
  // Only sets that hold a case. A set added to this list gets a toggle.
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

// The id "F2L" keys stored prefs, so only its label says which F2L set it is.
const SET_LABEL: Record<CaseSet, string> = {
  F2L: "Basic F2L",
  "Advanced F2L": "Advanced F2L",
  "Expert F2L": "Expert F2L",
  "2-Look OLL": "2-Look OLL",
  "2-Look PLL": "2-Look PLL",
  "Full OLL": "Full OLL",
  "Full PLL": "Full PLL",
};

// One color per set, used only here: it is what tells the strips apart. The
// F2L sets share a green family.
const SET_COLOR: Record<CaseSet, string> = {
  F2L: "#4ade80",
  "Advanced F2L": "#2dd4bf",
  "Expert F2L": "#a3e635",
  "2-Look OLL": "#facc15",
  "2-Look PLL": "#fb923c",
  "Full OLL": "#60a5fa",
  "Full PLL": "#f472b6",
};

const percent = (accuracy: number | null) =>
  accuracy === null ? "–" : `${Math.round(accuracy * 100)}%`;

export function createHome({ modes, sets, onMode, onSet, onRotation, onStart }: Handlers) {
  const modeButtons = new Map(modes.map((mode) => [mode, toggleButton(LABEL[mode], () => onMode(mode))]));
  const setButtons = new Map(sets.map((set) => [set, toggleButton(SET_LABEL[set], () => onSet(set))]));

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
  const rotation = toggleButton("", onRotation);
  rotation.classList.add("icon-toggle");
  rotation.title = "Toggle Random AUF";
  rotation.setAttribute("aria-label", "Toggle Random AUF");
  // Constant markup, never user text.
  rotation.innerHTML = SHUFFLE_ICON;
  const options = el("div", "options");
  options.append(rotation);

  const stats = el("div", "stats");

  const start = keyedButton("primary", "Start", "space", onStart);
  const startBar = el("div", "start");
  startBar.append(start.node);

  const element = el("main", "home");
  element.append(modeBox, setBox, options, stats, startBar);

  return {
    element,
    render({ mode, selected, rotation: randomAuf, learnDue, stats: view }: HomeView): void {
      for (const [m, button] of modeButtons) {
        button.textContent = m === "learn" ? `${LABEL[m]} · ${learnDue} due` : LABEL[m];
        button.setAttribute("aria-pressed", String(m === mode));
      }
      for (const [set, button] of setButtons) {
        button.setAttribute("aria-pressed", String(selected.includes(set)));
        // prefs.sets.verify can never include an F2L set, so those toggles are
        // disabled rather than hidden, staying legible as "not offered here".
        if (SET_GROUP[set] === "F2L") button.disabled = mode === "verify";
      }
      rotation.setAttribute("aria-pressed", String(randomAuf));
      stats.replaceChildren(
        ...view.map(({ set, seen, total, learned, missed, accuracy, due }) => {
          const strip = el("div", "ticks");
          strip.append(...tickStates(learned, missed, total).map((tick) => el("span", `tick ${tick}`)));
          const numbers = el("span", "stat-numbers", `${learned} / ${total} learned · ${percent(accuracy)} · ${due} due`);
          const head = el("div", "stat-head");
          head.append(el("span", "stat-name", SET_LABEL[set]), numbers);
          const row = el("div", "stat");
          row.style.setProperty("--set", SET_COLOR[set]);
          row.setAttribute("role", "img");
          row.setAttribute("aria-label", `${SET_LABEL[set]}: ${learned} of ${total} learned, ${missed} missed, ${total - seen} unseen, ${due} due`);
          row.append(head, strip);
          return row;
        }),
      );
    },
  };
}
