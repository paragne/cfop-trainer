/**
 * Wires the dev page's step-mode checkbox and prev/next buttons to a StepMode
 * controller, and keeps the algorithm display in sync with it. Arrow keys are
 * bound by the page, through src/ui/keys.ts's stepForKey.
 */
import { createStepMode } from "./step-mode.ts";
import type { StepMode } from "./step-mode.ts";
import { renderAlg } from "./alg-display.ts";
import type { Move } from "../../lib/notation.ts";
import type { Player } from "./player.ts";

export type StepControls = {
  isStepMode(): boolean;
  loadCase(moves: readonly Move[]): void;
  stepForward(): void;
  stepBackward(): void;
};

type Elements = {
  stepModeInput: HTMLInputElement;
  prevButton: HTMLButtonElement;
  nextButton: HTMLButtonElement;
  algContainer: HTMLElement;
};

export function attachStepControls(elements: Elements, player: Player): StepControls {
  const { stepModeInput, prevButton, nextButton, algContainer } = elements;

  // StepMode's own onSettled callback re-renders the display once a
  // requested step actually completes — not when it's merely requested,
  // since a request made while a move is animating just queues.
  function refreshDisplay(): void {
    renderAlg(algContainer, stepMode.moves(), stepMode.currentIndex());
  }
  const stepMode: StepMode = createStepMode(player, refreshDisplay);

  prevButton.addEventListener("click", stepMode.stepBackward);
  nextButton.addEventListener("click", stepMode.stepForward);

  return {
    isStepMode: () => stepModeInput.checked,
    loadCase: stepMode.load,
    stepForward: stepMode.stepForward,
    stepBackward: stepMode.stepBackward,
  };
}
