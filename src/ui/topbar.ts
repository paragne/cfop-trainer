import { logoSvg } from "../lib/logo.ts";
import { el } from "./dom.ts";

type Handlers = {
  onHome: () => void;
  onData: () => void;
};

// A tray with a down arrow: the file that export and import move.
const DATA_ICON =
  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M12 3v11M7.5 9.5 12 14l4.5-4.5M4 15v5h16v-5"/></svg>';

function iconButton(className: string, label: string, markup: string, onClick: () => void) {
  const node = el("button", className);
  node.type = "button";
  node.setAttribute("aria-label", label);
  // Markup from lib or a constant above, never from user text.
  node.innerHTML = markup;
  node.addEventListener("click", onClick);
  return node;
}

export function createTopbar({ onHome, onData }: Handlers) {
  const home = iconButton("logo", "CFOP Trainer, home", logoSvg(), onHome);
  const data = iconButton("icon", "Export and import", DATA_ICON, onData);
  data.setAttribute("aria-expanded", "false");

  // The empty first cell keeps the logo centered against the data icon.
  const element = el("header", "topbar");
  element.append(el("span", ""), home, data);

  return {
    element,
    setDataOpen(open: boolean): void {
      data.setAttribute("aria-expanded", String(open));
    },
  };
}
