import type { Action } from "../lib/screen.ts";

// `control` is a focused button, link or field, where Enter already means
// something and must keep meaning it. `code` is the physical key
// (KeyboardEvent.code): the numpad's own 0, decimal and 3 need their own
// triggers, since a shared key's reliance on whatever button last took focus
// made it land on the wrong button as often as the right one. `nextAvailable`
// is true only while Drill's Next button is the one on screen, so "n" can
// mean Next there without giving up its Names-toggle meaning everywhere else.
type KeyInput = {
  key: string;
  typing: boolean;
  modifier: boolean;
  repeat: boolean;
  control?: boolean;
  code?: string;
  nextAvailable?: boolean;
};

const BINDINGS = new Map<string, Action>([
  [" ", "reveal"],
  ["1", "dontKnow"],
  ["2", "know"],
  ["n", "toggleNames"],
]);

// Numpad 0 is reveal/begin/check/reset, numpad . is the correct/confirm
// action (know, match, next), numpad 3 is wrong (don't know, mismatch).
const NUMPAD_BINDINGS = new Map<string, Action>([
  ["Numpad0", "reveal"],
  ["NumpadDecimal", "know"],
  ["Numpad3", "dontKnow"],
]);

// Typing in a note must not grade, a held modifier is a browser shortcut
// (Ctrl+1 switches tabs), and auto-repeat must not grade five cards.
export function actionForKey({ key, typing, modifier, repeat, control = false, code, nextAvailable = false }: KeyInput): Action | null {
  if (typing || modifier || repeat || (control && key === "Enter")) return null;
  const numpad = code === undefined ? undefined : NUMPAD_BINDINGS.get(code);
  if (numpad !== undefined) return numpad;
  if (nextAvailable && key.toLowerCase() === "n") return "next";
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
// keeps its default. `nextAvailable` says whether Drill's Next button is the
// one currently on screen, checked fresh on every keydown.
export function bindKeys(onAction: (action: Action) => void, onStep: (step: Step) => boolean, nextAvailable: () => boolean): void {
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
      control: e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement || e.target instanceof HTMLInputElement,
      code: e.code,
      nextAvailable: nextAvailable(),
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
