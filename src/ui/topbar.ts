import logoMark from "../assets/logo-mark.svg";
import { el } from "./dom.ts";
import { HELP_ICON, MENU_ICON, NOTE_EDIT_ICON, THREE_D_ICON } from "./icons.ts";

type Handlers = {
  onHome: () => void;
  onMenu: () => void;
  onHelp: () => void;
  onNotes: () => void;
  onThreeD: () => void;
  onBack: () => void;
};

function iconButton(className: string, label: string, markup: string, onClick: () => void) {
  const node = el("button", className);
  node.type = "button";
  node.setAttribute("aria-label", label);
  node.title = label;
  // Markup from a constant or a bundled asset URL, never from user text.
  node.innerHTML = markup;
  node.addEventListener("click", onClick);
  return node;
}

export function createTopbar({ onHome, onMenu, onHelp, onNotes, onThreeD, onBack }: Handlers) {
  const home = iconButton("logo", "CFOP Driller, home", `<img src="${logoMark}" alt="" />`, onHome);
  const back = el("button", "back", "‹ Back");
  back.type = "button";
  back.hidden = true;
  back.addEventListener("click", onBack);
  const menu = iconButton("icon", "Menu", MENU_ICON, onMenu);
  menu.setAttribute("aria-expanded", "false");
  const help = iconButton("icon", "How to use", HELP_ICON, onHelp);
  help.setAttribute("aria-expanded", "false");
  const notes = iconButton("icon", "Edit note", NOTE_EDIT_ICON, onNotes);
  notes.hidden = true;
  const threeD = iconButton("icon", "3D view", THREE_D_ICON, onThreeD);
  threeD.setAttribute("aria-pressed", "false");
  threeD.hidden = true;

  // The left cell holds the menu on the home screen and the card's toggles
  // elsewhere; empty, it would let the logo drift off center.
  const left = el("div", "topbar-left");
  left.append(back, menu);
  const tools = el("div", "tools");
  tools.append(notes, threeD, help);
  const element = el("header", "topbar");
  element.append(left, home, tools);

  return {
    element,
    left,
    menuButton: menu,
    helpButton: help,
    setMenuOpen(open: boolean): void {
      menu.setAttribute("aria-expanded", String(open));
    },
    setHelpOpen(open: boolean): void {
      help.setAttribute("aria-expanded", String(open));
    },
    // A gallery card is the only screen with somewhere to go back to.
    setBack(available: boolean): void {
      back.hidden = !available;
    },
    // The menu and the how-to belong to the home screen alone.
    setHomeTools(available: boolean): void {
      menu.hidden = !available;
      help.hidden = !available;
    },
    // Only a Learn or Drill card has a note to write.
    setNotesAvailable(available: boolean): void {
      notes.hidden = !available;
    },
    // A mode, not a per-card choice, so it stays pressed from card to card.
    setThreeD(available: boolean, on: boolean): void {
      threeD.hidden = !available;
      threeD.setAttribute("aria-pressed", String(on));
    },
  };
}
