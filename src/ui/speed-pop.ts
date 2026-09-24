import { SPEED_RANGE } from "../lib/prefs.ts";
import { el, squareButton } from "./dom.ts";
import { BUNNY_ICON } from "./icons.ts";

// A speed slider tucked behind a button, out of the way until asked for and
// gone again on a click elsewhere or Escape. Not a dialog: nothing else on the
// page is blocked while it is open.
export function createSpeedPop(onSpeed: (speed: number) => void) {
  const input = el("input", "");
  input.type = "range";
  input.min = String(SPEED_RANGE.min);
  input.max = String(SPEED_RANGE.max);
  input.step = String(SPEED_RANGE.step);
  input.setAttribute("aria-label", "Speed");
  input.addEventListener("input", () => onSpeed(Number(input.value)));

  const popover = el("label", "speed-pop", "Speed");
  popover.hidden = true;
  popover.append(input);

  const button = squareButton("Speed", BUNNY_ICON, () => setOpen(!open));
  button.setAttribute("aria-expanded", "false");

  let open = false;
  function setOpen(next: boolean): void {
    open = next;
    popover.hidden = !next;
    button.setAttribute("aria-expanded", String(next));
  }
  document.addEventListener("pointerdown", (e) => {
    if (e.target instanceof Node && !popover.contains(e.target) && !button.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });

  return {
    button,
    popover,
    close: () => setOpen(false),
    setValue(speed: number): void {
      input.value = String(speed);
    },
  };
}
