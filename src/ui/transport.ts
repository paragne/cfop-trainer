import { createAestheticPop } from "./aesthetic-pop.ts";
import type { Aesthetic } from "../lib/aesthetic.ts";
import { createAlgPicker } from "./alg-picker.ts";
import { el, squareButton } from "./dom.ts";
import { CENTER_ICON, START_OVER_ICON } from "./icons.ts";
import { createSpeedPop } from "./speed-pop.ts";

// What the alg picker calls back with. A scene with its own list of solutions
// has no use for it, and passes null.
export type Picker = {
  onChoose: (algIndex: number) => void;
  onStar: (algIndex: number) => void;
};

type Handlers = {
  picker: Picker | null;
  onSpeed: (speed: number) => void;
  onAesthetic: (aesthetic: Aesthetic) => void;
  onCenter: () => void;
  onStartOver: () => void;
  onBack: () => void;
  onPlay: () => void;
  onForward: () => void;
};

// Top row floats over the cube: the cube style, the algorithm picker, speed,
// and center camera. It stays available before the
// solution is revealed, since free orbit does too. Bottom row is the
// algorithm player: play, start over, step back, step forward.
export function createTransport({ picker, onSpeed, onAesthetic, onCenter, onStartOver, onBack, onPlay, onForward }: Handlers) {
  const speedPop = createSpeedPop(onSpeed);
  const algPicker = picker === null ? null : createAlgPicker(picker.onChoose, picker.onStar);
  const aesthetic = createAestheticPop(onAesthetic);
  const center = squareButton("Center camera", CENTER_ICON, onCenter);

  const topRow = el("div", "step-buttons frame-controls");
  topRow.append(
    aesthetic.button,
    ...(algPicker === null ? [] : [algPicker.button]),
    speedPop.button,
    center,
    aesthetic.popover,
    speedPop.popover,
    ...(algPicker === null ? [] : [algPicker.popover]),
  );

  const bottomRow = el("div", "step-buttons");
  bottomRow.append(
    squareButton("Play", "▶", onPlay),
    squareButton("Start over", START_OVER_ICON, onStartOver),
    squareButton("Step back", "&lt;", onBack),
    squareButton("Step forward", "&gt;", onForward),
  );

  const closePopups = () => {
    speedPop.close();
    algPicker?.close();
    aesthetic.close();
  };

  return { topRow, bottomRow, speedPop, algPicker, aesthetic, closePopups };
}
