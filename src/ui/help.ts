import { el } from "./dom.ts";
import { dismissable } from "./panel.ts";

const TOPICS: readonly (readonly [string, string])[] = [
  ["Learn", "Cases come up on a schedule. Solve it on your cube or in your head, reveal the answer, then grade yourself: 1 for missed it, 2 for knew it."],
  ["Drill", "Endless cases, nothing graded or saved. Enter shows the next one."],
  ["Verify", "Do each case's algorithm on your cube, then check the cube against the picture. It runs until you go home."],
  ["Gallery", "Every case in the sets you pick, as a grid. Tap one for its full card. Back returns to the same place in the grid. Nothing is graded or timed."],
  ["Keys", "Space reveals. N hides or shows the name. In 3D, left and right step through the algorithm, down goes to the start and up to the end."],
  ["Shuffle", "Off, cases come in the order the sets are listed. Random AUF turns OLL and PLL pictures so you learn them from any angle."],
  ["Your data", "Progress lives in this browser. Save Data downloads it, and Load Data brings it back on another device."],
];

// What the app does, in place under the top bar. Static text: nothing here is
// built from user input.
export function createHelp(trigger: HTMLElement, onOpenChange: (open: boolean) => void) {
  const element = el("section", "data help");
  element.hidden = true;
  const list = el("dl", "help-list");
  for (const [term, text] of TOPICS) list.append(el("dt", "", term), el("dd", "", text));
  element.append(list);
  return { element, ...dismissable(element, trigger, onOpenChange) };
}
