/**
 * Wires step mode's checkbox, prev/next buttons and arrow keys to a
 * StepMode controller, and keeps the algorithm display in sync with it.
 * Arrow keys are ignored while focus is in a text-entry control, mirroring
 * src/ui/keys.ts's typing guard (three-d.html has no such field today, but
 * the guard costs nothing and holds if one is ever added).
 */
import { createStepMode } from "./step-mode.ts";
import type { StepMode } from "./step-mode.ts";
import { renderAlg } from "./alg-display.ts";
import type { Move } from "../../lib/notation.ts";
import type { Player } from "./player.ts";

export type StepControls = {
  isStepMode(): boolean;
  loadCase(moves: readonly Move[]): void;
};

type Elements = {
  stepModeInput: HTMLInputElement;
  prevButton: HTMLButtonElement;
  nextButton: HTMLButtonElement;
  algContainer: HTMLElement;
};

function isTextEntry(el: Element | null): boolean {
  if (el instanceof HTMLTextAreaElement) return true;
  if (!(el instanceof HTMLInputElement)) return false;
  return !["checkbox", "radio", "range", "button"].includes(el.type);
}

export function attachStepControls(elements: Elements, player: Player): StepControls {
  const { stepModeInput, prevButton, nextButton, algContainer } = elements;
  const stepMode: StepMode = createStepMode(player);

  function refreshDisplay(): void {
    renderAlg(algContainer, stepMode.moves(), stepMode.currentIndex());
  }

  function stepForward(): void {
    stepMode.stepForward();
    refreshDisplay();
  }

  function stepBackward(): void {
    stepMode.stepBackward();
    refreshDisplay();
  }

  prevButton.addEventListener("click", stepBackward);
  nextButton.addEventListener("click", stepForward);

  document.addEventListener("keydown", (e) => {
    if (isTextEntry(document.activeElement)) return;
    if (e.key === "ArrowRight") stepForward();
    else if (e.key === "ArrowLeft") stepBackward();
    else return;
    e.preventDefault();
  });

  return {
    isStepMode: () => stepModeInput.checked,
    loadCase(moves) {
      stepMode.load(moves);
      refreshDisplay();
    },
  };
}
