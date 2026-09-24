import { logoSvg } from "../lib/logo.ts";
import { el } from "./dom.ts";
import { THREE_D_ICON } from "./icons.ts";

type Handlers = {
  onHome: () => void;
  onData: () => void;
  onThreeD: () => void;
};

// A tray with a down arrow: the file that export and import move.
const DATA_ICON =
  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M12 3v11M7.5 9.5 12 14l4.5-4.5M4 15v5h16v-5"/></svg>';

function iconButton(className: string, label: string, markup: string, onClick: () => void) {
  const node = el("button", className);
  node.type = "button";
  node.setAttribute("aria-label", label);
  node.title = label;
  // Markup from lib or a constant above, never from user text.
  node.innerHTML = markup;
  node.addEventListener("click", onClick);
  return node;
}

export function createTopbar({ onHome, onData, onThreeD }: Handlers) {
  const home = iconButton("logo", "CFOP Trainer, home", logoSvg(), onHome);
  const data = iconButton("icon", "Export and import", DATA_ICON, onData);
  data.setAttribute("aria-expanded", "false");
  const threeD = iconButton("icon", "3D view", THREE_D_ICON, onThreeD);
  threeD.setAttribute("aria-pressed", "false");
  threeD.hidden = true;

  // The left cell holds the card's toggles; empty, it keeps the logo centered
  // against the tools.
  const left = el("div", "topbar-left");
  const tools = el("div", "tools");
  tools.append(threeD, data);
  const element = el("header", "topbar");
  element.append(left, home, tools);

  return {
    element,
    left,
    dataButton: data,
    setDataOpen(open: boolean): void {
      data.setAttribute("aria-expanded", String(open));
    },
    // Export and import belong to the home screen alone.
    setDataAvailable(available: boolean): void {
      data.hidden = !available;
    },
    // A mode, not a per-card choice, so it stays pressed from card to card.
    setThreeD(available: boolean, on: boolean): void {
      threeD.hidden = !available;
      threeD.setAttribute("aria-pressed", String(on));
    },
  };
}
