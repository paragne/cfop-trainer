import { caseMask } from "../lib/case-state.ts";
import { algMoves, playStart } from "../lib/play.ts";
import type { CaseView, PlayView } from "../lib/play.ts";
import type { Prefs } from "../lib/prefs.ts";
import type { Progress } from "../lib/progress.ts";
import { starredAlg } from "../lib/stars.ts";
import { createPlayStage } from "./play-stage.ts";
import type { Scene } from "./play-scene.ts";
import { legendFaces } from "./three-d/panel-session.ts";

export type PlayHandlers = {
  onStar: (algIndex: number) => void;
  onSpeed: (speed: number) => void;
  onAesthetic: (aesthetic: Prefs["aesthetic"]) => void;
  onZoom: (zoom: number) => void;
};

// A card's picture: the 2D one, or the case in 3D. The play stage does the
// showing; this says what a case looks like to it.
export function createPlayPanel({ onStar, onSpeed, onAesthetic, onZoom }: PlayHandlers) {
  const stage = createPlayStage({ onSpeed, onAesthetic, onZoom, picker: { onChoose: chooseAlg, onStar } });

  let shown: CaseView | null = null;
  let solution: PlayView | null = null;
  let loadedId = "";
  // What animates: the screen's own pick (the starred alg) until the picker
  // says otherwise. Only a preview, so it is never written anywhere.
  let chosenAlg = 0;

  const sceneOf = (view: CaseView, play: PlayView | null, id: string): Scene => ({
    key: view.key,
    id,
    mask: caseMask(view.c),
    start: playStart(view.c, view.auf),
    moves: play === null ? null : algMoves(view.c, view.auf, chosenAlg),
    legend: (session) => legendFaces(session, view.c),
  });

  function chooseAlg(algIndex: number): void {
    chosenAlg = algIndex;
    if (shown !== null) stage.reload(sceneOf(shown, solution, loadedId));
  }

  return {
    element: stage.element,
    // Where the 2D picture goes.
    picture: stage.picture,
    // Null closes the 3D view and gives its GPU context back.
    // Says whether the 3D view is showing.
    show(next: CaseView | null, play: PlayView | null, prefs: Prefs, stars: Progress["stars"]): boolean {
      if (next === null) {
        loadedId = "";
        return stage.show(null, prefs);
      }
      const id = `${next.key}|${play === null ? "-" : play.alg}`;
      if (id !== loadedId) chosenAlg = play?.alg ?? 0;
      shown = next;
      solution = play;
      const showing = stage.show(sceneOf(next, play, id), prefs);
      loadedId = showing ? id : "";
      stage.algPicker?.sync(play !== null, next.c, next.auf, chosenAlg, starredAlg(next.c, stars));
      return showing;
    },
    step: stage.step,
  };
}
