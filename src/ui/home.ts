import { SET_GROUP } from "../data/algorithms.ts";
import type { CaseSet } from "../data/algorithms.ts";
import type { Mode } from "../lib/prefs.ts";
import { SET_ORDER } from "../lib/selection.ts";
import { tickStates } from "../lib/stats.ts";
import type { SetStats } from "../lib/stats.ts";
import { el, keyedButton, toggleButton } from "./dom.ts";
import { AUF_ICON, CREDIT_MARK, SHUFFLE_ICON } from "./icons.ts";

type Handlers = {
  // Only modes that exist. A mode added to this list gets a button.
  modes: readonly Mode[];
  // Only sets that hold a case. A set added to this list gets a toggle.
  sets: readonly CaseSet[];
  onMode: (mode: Mode) => void;
  onSet: (set: CaseSet) => void;
  onShuffle: () => void;
  onRotation: () => void;
  onStart: () => void;
};

export type HomeView = {
  mode: Mode;
  selected: readonly CaseSet[];
  shuffle: boolean;
  rotation: boolean;
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

// A rainbow down the page, in the order the sets are listed: it is what tells
// the strips apart.
const SET_COLOR: Record<CaseSet, string> = {
  F2L: "#f87171",
  "Advanced F2L": "#fb923c",
  "Expert F2L": "#facc15",
  "2-Look OLL": "#4ade80",
  "Full OLL": "#60a5fa",
  "2-Look PLL": "#818cf8",
  "Full PLL": "#c084fc",
};

// The set toggles, a row per family. Each row is narrower than the one above.
const ROWS: readonly (readonly CaseSet[])[] = [
  ["F2L", "Advanced F2L", "Expert F2L"],
  ["2-Look OLL", "Full OLL"],
  ["2-Look PLL", "Full PLL"],
];

const REPO_URL = "https://github.com/paragne/cfop-trainer";

const percent = (accuracy: number | null) =>
  accuracy === null ? "–" : `${Math.round(accuracy * 100)}%`;

function iconToggle(label: string, markup: string, onClick: () => void): HTMLButtonElement {
  const button = toggleButton("", onClick);
  button.classList.add("icon-toggle");
  button.title = label;
  button.setAttribute("aria-label", label);
  // Constant markup, never user text.
  button.innerHTML = markup;
  return button;
}

export function createHome({ modes, sets, onMode, onSet, onShuffle, onRotation, onStart }: Handlers) {
  const modeButtons = new Map(modes.map((mode) => [mode, toggleButton(LABEL[mode], () => onMode(mode))]));
  const setButtons = new Map(sets.map((set) => [set, toggleButton(SET_LABEL[set], () => onSet(set))]));

  const modeBox = el("div", "modes");
  modeBox.setAttribute("role", "group");
  modeBox.setAttribute("aria-label", "Mode");
  modeBox.append(...modeButtons.values());

  const setRows = ROWS.map((row, i) => {
    const buttons = row.flatMap((set) => setButtons.get(set) ?? []);
    const box = el("div", i === 0 ? "set-row f2l" : "set-row last-layer");
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", "Case sets");
    box.append(...buttons);
    box.hidden = buttons.length === 0;
    return box;
  });

  // Both apply in every mode, so they sit with the session setup and not on
  // the card screens. A random AUF turns the OLL and PLL pictures.
  const shuffle = iconToggle("Toggle Shuffle", SHUFFLE_ICON, onShuffle);
  const rotation = iconToggle("Toggle Random AUF", AUF_ICON, onRotation);
  const options = el("div", "options");
  options.append(shuffle, rotation);

  const stats = el("div", "stats");

  const start = keyedButton("primary", "Start", "space", onStart);

  const credit = el("p", "credit");
  const mark = el("span", "credit-mark");
  mark.innerHTML = CREDIT_MARK;
  const author = el("a", "", "Paragone on GitHub");
  author.href = REPO_URL;
  credit.append(mark, author, ` · v${__APP_VERSION__}`);

  // Sticky as a pair, so the credit line never lands past the reachable
  // bottom of the scroll where a sticky footer's own height would hide it.
  const startBar = el("div", "start");
  startBar.append(start.node, credit);

  const element = el("main", "home");
  element.append(modeBox, ...setRows, options, stats, startBar);

  return {
    element,
    render({ mode, selected, shuffle: shuffled, rotation: randomAuf, stats: view }: HomeView): void {
      for (const [m, button] of modeButtons) {
        button.setAttribute("aria-pressed", String(m === mode));
      }
      for (const [set, button] of setButtons) {
        button.setAttribute("aria-pressed", String(selected.includes(set)));
        // prefs.sets.verify can never include an F2L set, so those toggles are
        // disabled rather than hidden, staying legible as "not offered here".
        if (SET_GROUP[set] === "F2L") button.disabled = mode === "verify";
      }
      start.node.disabled = selected.length === 0;
      shuffle.setAttribute("aria-pressed", String(shuffled));
      rotation.setAttribute("aria-pressed", String(randomAuf));
      stats.replaceChildren(
        ...view.toSorted((a, b) => SET_ORDER.indexOf(a.set) - SET_ORDER.indexOf(b.set)).map(({ set, seen, total, learned, missed, accuracy, due }) => {
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
