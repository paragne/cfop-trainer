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

  // StepMode's own onSettled callback re-renders the display once a
  // requested step actually completes — not when it's merely requested,
  // since a request made while a move is animating just queues.
  function refreshDisplay(): void {
    renderAlg(algContainer, stepMode.moves(), stepMode.currentIndex());
  }
  const stepMode: StepMode = createStepMode(player, refreshDisplay);

  prevButton.addEventListener("click", stepMode.stepBackward);
  nextButton.addEventListener("click", stepMode.stepForward);

  document.addEventListener("keydown", (e) => {
    if (isTextEntry(document.activeElement)) return;
    if (e.key === "ArrowRight") stepMode.stepForward();
    else if (e.key === "ArrowLeft") stepMode.stepBackward();
    else return;
    e.preventDefault();
  });

  return {
    isStepMode: () => stepModeInput.checked,
    loadCase: stepMode.load,
  };
}
