import logoMark from "../assets/logo-mark.svg";
import type { HotkeyLabels } from "../lib/prefs.ts";
import { el, toggleButton } from "./dom.ts";
import { HELP_ICON, MENU_ICON, NOTE_EDIT_ICON, THREE_D_ICON } from "./icons.ts";

type Handlers = {
  onHome: () => void;
  onMenu: () => void;
  onHelp: () => void;
  onNotes: () => void;
  onThreeD: () => void;
  onHotkeyLabels: (mode: HotkeyLabels) => void;
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

export function createTopbar({ onHome, onMenu, onHelp, onNotes, onThreeD, onHotkeyLabels }: Handlers) {
  const home = iconButton("logo", "CFOP Trainer, home", `<img src="${logoMark}" alt="" />`, onHome);
  const menu = iconButton("icon", "Menu", MENU_ICON, onMenu);
  menu.setAttribute("aria-expanded", "false");
  const help = iconButton("icon", "How to use", HELP_ICON, onHelp);
  help.setAttribute("aria-expanded", "false");
  const notes = iconButton("icon", "Edit note", NOTE_EDIT_ICON, onNotes);
  notes.hidden = true;
  // How the card screens label their key hints. Hidden entirely on a
  // touch-primary device, where there is no keyboard to label anyway.
  const numpad = toggleButton("Numpad", () => onHotkeyLabels("numpad"));
  const keyboard = toggleButton("Keyboard", () => onHotkeyLabels("keyboard"));
  const hotkeyLabels = el("div", "prefs");
  hotkeyLabels.setAttribute("role", "group");
  hotkeyLabels.setAttribute("aria-label", "Key hint labels");
  hotkeyLabels.append(numpad, keyboard);
  hotkeyLabels.hidden = true;
  const threeD = iconButton("icon", "3D view", THREE_D_ICON, onThreeD);
  threeD.setAttribute("aria-pressed", "false");
  threeD.hidden = true;

  // The left cell holds the menu on the home screen and the card's toggles
  // elsewhere; empty, it would let the logo drift off center.
  const left = el("div", "topbar-left");
  left.append(menu);
  const tools = el("div", "tools");
  tools.append(notes, hotkeyLabels, threeD, help);
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
    // The menu and the how-to belong to the home screen alone.
    setHomeTools(available: boolean): void {
      menu.hidden = !available;
      help.hidden = !available;
    },
    // Only a Learn or Drill card has a note to write.
    setNotesAvailable(available: boolean): void {
      notes.hidden = !available;
    },
    // Shown only on a card screen, and only where there is a keyboard to
    // label in the first place.
    setHotkeyLabels(available: boolean, mode: HotkeyLabels): void {
      hotkeyLabels.hidden = !available;
      numpad.setAttribute("aria-pressed", String(mode === "numpad"));
      keyboard.setAttribute("aria-pressed", String(mode === "keyboard"));
    },
    // A mode, not a per-card choice, so it stays pressed from card to card.
    setThreeD(available: boolean, on: boolean): void {
      threeD.hidden = !available;
      threeD.setAttribute("aria-pressed", String(on));
    },
  };
}
