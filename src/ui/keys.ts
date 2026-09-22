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

export function bindKeys(onAction: (action: Action) => void): void {
  const typing = (e: KeyboardEvent) => e.target instanceof HTMLTextAreaElement;

  document.addEventListener("keydown", (e) => {
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
