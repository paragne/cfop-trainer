import { el, squareButton } from "./dom.ts";
import { SKIP_BACK_ICON, SKIP_FORWARD_ICON } from "./icons.ts";
import { createSpeedPop } from "./speed-pop.ts";

type Handlers = {
  onSpeed: (speed: number) => void;
  onStart: () => void;
  onBack: () => void;
  onPlay: () => void;
  onForward: () => void;
  onEnd: () => void;
};

// [speed, go to start, step back, play, step forward, go to end], with the
// speed grid floating above the row.
export function createTransport({ onSpeed, onStart, onBack, onPlay, onForward, onEnd }: Handlers) {
  const speedPop = createSpeedPop(onSpeed);
  const element = el("div", "step-buttons");
  element.append(
    speedPop.button,
    squareButton("Go to start", SKIP_BACK_ICON, onStart),
    squareButton("Step back", "&lt;", onBack),
    squareButton("Play", "▶", onPlay),
    squareButton("Step forward", "&gt;", onForward),
    squareButton("Go to end", SKIP_FORWARD_ICON, onEnd),
    speedPop.popover,
  );
  return { element, speedPop };
}
