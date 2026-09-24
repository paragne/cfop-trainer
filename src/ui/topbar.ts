import { logoSvg } from "../lib/logo.ts";
import { el } from "./dom.ts";

type Handlers = {
  onHome: () => void;
  onData: () => void;
  onPlay: () => void;
};

// A tray with a down arrow: the file that export and import move.
const DATA_ICON =
  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M12 3v11M7.5 9.5 12 14l4.5-4.5M4 15v5h16v-5"/></svg>';

// A play triangle: the solution, animated.
const PLAY_ICON =
  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

function iconButton(className: string, label: string, markup: string, onClick: () => void) {
  const node = el("button", className);
  node.type = "button";
  node.setAttribute("aria-label", label);
  // Markup from lib or a constant above, never from user text.
  node.innerHTML = markup;
  node.addEventListener("click", onClick);
  return node;
}

export function createTopbar({ onHome, onData, onPlay }: Handlers) {
  const home = iconButton("logo", "CFOP Trainer, home", logoSvg(), onHome);
  const data = iconButton("icon", "Export and import", DATA_ICON, onData);
  data.setAttribute("aria-expanded", "false");
  const play = iconButton("icon", "Play the solution in 3D", PLAY_ICON, onPlay);
  play.setAttribute("aria-pressed", "false");
  play.hidden = true;

  // The empty first cell keeps the logo centered against the tools.
  const tools = el("div", "tools");
  tools.append(play, data);
  const element = el("header", "topbar");
  element.append(el("span", ""), home, tools);

  return {
    element,
    setDataOpen(open: boolean): void {
      data.setAttribute("aria-expanded", String(open));
    },
    // Shown only where playing is allowed, since it reveals the solution.
    setPlay(available: boolean, active: boolean): void {
      play.hidden = !available;
      play.setAttribute("aria-pressed", String(active));
      play.setAttribute("aria-label", active ? "Back to the 2D picture" : "Play the solution in 3D");
    },
  };
}
