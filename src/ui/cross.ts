import type { CrossRound } from "../lib/cross-round.ts";
import { stringify } from "../lib/notation.ts";
import type { Prefs } from "../lib/prefs.ts";
import { el, keyedButton } from "./dom.ts";
import type { PlayHandlers } from "./play-panel.ts";
import type { Scene } from "./play-scene.ts";
import { createPlayStage } from "./play-stage.ts";

type Handlers = {
  onReveal: () => void;
  onNext: () => void;
  onChoose: (solution: number) => void;
  play: Omit<PlayHandlers, "onStar">;
};

// The cross has no case to name, note, star or grade, so this card is the
// scramble in 3D, the ranked solutions once revealed, and Reveal and Next.
export function createCross({ onReveal, onNext, onChoose, play }: Handlers) {
  const element = el("section", "card cross");
  const stage = createPlayStage({ ...play, picker: null });
  const figure = el("figure", "case");
  const noWebGl = el("p", "quiet", "Cross needs WebGL 2, which this browser does not offer.");
  noWebGl.hidden = true;
  figure.append(stage.element, noWebGl);
  const scramble = el("p", "scramble");
  const solutions = el("div", "solution");
  solutions.hidden = true;
  const heading = el("p", "meta");
  const list = el("div", "alg-list");
  solutions.append(heading, list);

  const reveal = keyedButton("primary", "Reveal", "space / num0", onReveal);
  const next = keyedButton("", "Next", "n / num.", onNext);
  const actions = el("nav", "actions");
  actions.append(reveal.node, next.node);
  element.append(figure, scramble, solutions, actions);

  // A scramble is a whole cube, so the loaded scene names the picture, the mask
  // and which solution is up: any of them changing reloads the view.
  const sceneOf = (round: CrossRound, allStickers: boolean): Scene => {
    const key = `cross|${stringify(round.scramble)}`;
    return {
      key,
      id: `${key}|${allStickers}|${round.revealed ? round.chosen : "-"}`,
      mask: { kind: "cross", all: allStickers },
      start: round.cube,
      moves: round.revealed ? round.solutions[round.chosen] : null,
      legend: () => null,
    };
  };

  return {
    element,
    // Null closes the 3D view and gives its GPU context back.
    render(round: CrossRound | null, prefs: Prefs): void {
      if (round === null) {
        stage.show(null, prefs);
        return;
      }
      noWebGl.hidden = stage.show(sceneOf(round, prefs.crossAllStickers), prefs);
      scramble.textContent = `Scramble: ${stringify(round.scramble)}`;
      solutions.hidden = !round.revealed;
      heading.textContent = `Shortest cross: ${round.solutions[0].length} moves`;
      list.replaceChildren(
        ...round.solutions.map((moves, i) => {
          const choice = el("button", "toggle alg-choice", stringify(moves));
          choice.type = "button";
          choice.setAttribute("aria-pressed", String(i === round.chosen));
          choice.addEventListener("click", () => onChoose(i));
          return choice;
        }),
      );
      reveal.text.textContent = round.revealed ? "Hide" : "Reveal";
      for (const kbd of [reveal.kbd, next.kbd]) kbd.hidden = !prefs.showHotkeys;
    },
    step: stage.step,
  };
}
