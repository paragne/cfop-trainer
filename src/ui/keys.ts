import type { Action } from "../lib/screen.ts";

type KeyInput = { key: string; typing: boolean; modifier: boolean; repeat: boolean };

const BINDINGS = new Map<string, Action>([
  [" ", "reveal"],
  ["1", "dontKnow"],
  ["2", "know"],
  ["n", "toggleNames"],
]);

// Typing in a note must not grade, a held modifier is a browser shortcut
// (Ctrl+1 switches tabs), and auto-repeat must not grade five cards.
export function actionForKey({ key, typing, modifier, repeat }: KeyInput): Action | null {
  if (typing || modifier || repeat) return null;
  return BINDINGS.get(key.toLowerCase()) ?? null;
}

export type Step = "back" | "forward" | "start" | "end";

// Left and right step, up and down jump to the end and the start. Arrows also move a caret in a note and a slider's thumb, so they yield to
// both. They are not an Action: they never grade, reveal or reach the screen.
export function stepForKey({ key, typing, modifier }: Omit<KeyInput, "repeat">): Step | null {
  if (typing || modifier) return null;
  if (key === "ArrowLeft") return "back";
  if (key === "ArrowRight") return "forward";
  if (key === "ArrowUp") return "end";
  return key === "ArrowDown" ? "start" : null;
}

// Whether an arrow key belongs to the control that has focus instead.
export const editingKey = (target: EventTarget | null): boolean =>
  target instanceof HTMLTextAreaElement || (target instanceof HTMLInputElement && target.type === "range");

// `onStep` says whether it used the key, so an arrow with no 3D view to step
// keeps its default.
export function bindKeys(onAction: (action: Action) => void, onStep: (step: Step) => boolean): void {
  const typing = (e: KeyboardEvent) => e.target instanceof HTMLTextAreaElement;

  document.addEventListener("keydown", (e) => {
    const step = stepForKey({ key: e.key, typing: editingKey(e.target), modifier: e.ctrlKey || e.metaKey || e.altKey });
    if (step !== null && onStep(step)) {
      e.preventDefault();
      return;
    }
    const action = actionForKey({
      key: e.key,
      typing: typing(e),
      modifier: e.ctrlKey || e.metaKey || e.altKey,
      repeat: e.repeat,
    });
    if (action === null) return;
    e.preventDefault();
    onAction(action);
  });

  // A focused button clicks on Space's keyup, on top of the reveal the keydown
  // already did.
  document.addEventListener("keyup", (e) => {
    if (e.key === " " && !typing(e)) e.preventDefault();
  });
}
