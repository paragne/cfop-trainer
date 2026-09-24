import { SPEEDS } from "../lib/prefs.ts";
import { el, squareButton } from "./dom.ts";

const label = (speed: number) => `${speed}x`;

// A grid of speeds behind a button that shows the current one, out of the way
// until asked for and gone again on a pick, a click elsewhere or Escape. Not a
// dialog: nothing else on the page is blocked while it is open.
export function createSpeedPop(onSpeed: (speed: number) => void) {
  const options = new Map(
    SPEEDS.map((speed) => {
      const option = squareButton(`${label(speed)} speed`, label(speed), () => {
        onSpeed(speed);
        setOpen(false);
      });
      return [speed, option];
    }),
  );
  const grid = el("div", "speed-grid");
  grid.append(...options.values());

  const popover = el("div", "speed-pop");
  popover.hidden = true;
  popover.append(el("span", "speed-title", "Playback Speed"), grid);

  const button = squareButton("Playback speed", "", () => setOpen(!open));
  button.classList.add("speed-value");
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
      button.textContent = label(speed);
      for (const [s, option] of options) option.setAttribute("aria-pressed", String(s === speed));
    },
  };
}
