import type { IntroMode } from "../lib/screen.ts";
import { el, keyedButton } from "./dom.ts";

// The instruction page shown once, between Home's Start button and the first
// case, for Learn and Drill. Verify has its own equivalent built into its
// "ready" phase (see ui/verify.ts). Static text: nothing here is built from
// user input.
const COPY: Record<IntroMode, { title: string; body: readonly string[] }> = {
  learn: {
    title: "Learn",
    body: [
      "Cases come up on a spaced-repetition schedule. Solve each one on your cube or in your head before you reveal it: this is honor code, not a cube check.",
      "Reveal shows the algorithm. Grade yourself honestly with Know it or Don't know it. Your grade decides when this case comes back.",
      "Names, notes and auto-reveal are sticky preferences, toggled from the bar above the card.",
    ],
  },
  drill: {
    title: "Drill",
    body: [
      "Endless, unscheduled cycling through your chosen sets. Nothing here is graded or saved.",
      "Next shows another case, in random order unless Shuffle is off. Notes stay editable, since they are your own text, not a grade.",
    ],
  },
};

export function createIntro(onBegin: () => void) {
  const element = el("section", "card intro");
  const title = el("h1", "");
  const body = el("div", "intro-body");
  const begin = keyedButton("primary", "Begin", "space / num0", onBegin);
  const actions = el("nav", "actions");
  actions.append(begin.node);
  element.append(title, body, actions);

  return {
    element,
    render(mode: IntroMode, showHotkeys: boolean): void {
      const copy = COPY[mode];
      title.textContent = copy.title;
      body.replaceChildren(...copy.body.map((text) => el("p", "hint", text)));
      begin.kbd.hidden = !showHotkeys;
    },
  };
}
