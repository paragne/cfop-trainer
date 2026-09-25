import { el, squareButton } from "./dom.ts";
import { CENTER_ICON, START_OVER_ICON } from "./icons.ts";
import { createSpeedPop } from "./speed-pop.ts";

type Handlers = {
  onSpeed: (speed: number) => void;
  onCenter: () => void;
  onStartOver: () => void;
  onBack: () => void;
  onPlay: () => void;
  onForward: () => void;
};

// Top row floats over the cube: an aesthetic selector (its slot, filled in a
// later phase), speed, and center camera. It stays available before the
// solution is revealed, since free orbit does too. Bottom row is the
// algorithm player: play, start over, step back, step forward.
export function createTransport({ onSpeed, onCenter, onStartOver, onBack, onPlay, onForward }: Handlers) {
  const speedPop = createSpeedPop(onSpeed);
  const aesthetic = el("div", "step aesthetic-placeholder");
  aesthetic.setAttribute("aria-hidden", "true");
  const center = squareButton("Center camera", CENTER_ICON, onCenter);

  const topRow = el("div", "step-buttons frame-controls");
  topRow.append(aesthetic, speedPop.button, center, speedPop.popover);

  const bottomRow = el("div", "step-buttons");
  bottomRow.append(
    squareButton("Play", "▶", onPlay),
    squareButton("Start over", START_OVER_ICON, onStartOver),
    squareButton("Step back", "&lt;", onBack),
    squareButton("Step forward", "&gt;", onForward),
  );

  return { topRow, bottomRow, speedPop };
}
