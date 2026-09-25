import { ALL_CASES } from "../data/algorithms.ts";
import { caseView, playView } from "../lib/play.ts";
import type { Progress } from "../lib/progress.ts";
import { cardView, resultText, verifyView } from "../lib/screen.ts";
import type { Screen } from "../lib/screen.ts";
import { setStats } from "../lib/stats.ts";
import type { createFlashcard } from "./flashcard.ts";
import type { createHelp } from "./help.ts";
import type { createHome } from "./home.ts";
import type { createMenu } from "./menu.ts";
import type { createPrefBar } from "./pref-bar.ts";
import type { createSummary } from "./summary.ts";
import { webgl2Available } from "./three-d/webgl-support.ts";
import type { createTopbar } from "./topbar.ts";
import type { createVerify } from "./verify.ts";

type Parts = {
  topbar: ReturnType<typeof createTopbar>;
  menu: ReturnType<typeof createMenu>;
  help: ReturnType<typeof createHelp>;
  home: ReturnType<typeof createHome>;
  prefBar: ReturnType<typeof createPrefBar>;
  flashcard: ReturnType<typeof createFlashcard>;
  verify: ReturnType<typeof createVerify>;
  summary: ReturnType<typeof createSummary>;
};

// Brings every part of the page in line with the state: which screen shows,
// and what each part on it says.
export function renderApp(
  { topbar, menu, help, home, prefBar, flashcard, verify, summary }: Parts,
  progress: Progress,
  screen: Screen,
  touchPrimary: boolean,
): void {
  const onHome = screen.kind === "home";
  topbar.setHomeTools(onHome);
  if (!onHome) {
    menu.close();
    help.close();
  }
  home.element.hidden = !onHome;
  prefBar.element.hidden = onHome;
  if (onHome) {
    home.render({
      mode: progress.prefs.mode,
      selected: progress.prefs.sets[progress.prefs.mode],
      shuffle: progress.prefs.shuffle,
      rotation: progress.prefs.randomRotation,
      stats: setStats(ALL_CASES, progress.cards, Date.now()),
    });
  } else {
    prefBar.render(progress);
  }
  const view = cardView(screen);
  const verifying = verifyView(screen);
  const result = resultText(screen);
  flashcard.element.hidden = view === null;
  verify.element.hidden = verifying === null;
  summary.element.hidden = result === null;
  if (view !== null) flashcard.render(view, progress);
  if (verifying !== null) verify.render(verifying, progress);
  if (result !== null) summary.render(result);

  const available = webgl2Available();
  const shown = progress.prefs.threeD && available ? caseView(screen) : null;
  const playing = shown === null ? null : playView(screen);
  const onCard = view !== null || verifying !== null;
  topbar.setNotesAvailable(onCard);
  topbar.setThreeD(available && onCard, progress.prefs.threeD);
  topbar.setHotkeyLabels(onCard && !touchPrimary, progress.prefs.hotkeyLabels);
  flashcard.setHotkeyMode(progress.prefs.hotkeyLabels);
  verify.setHotkeyMode(progress.prefs.hotkeyLabels);
  flashcard.setPlay(view === null ? null : shown, playing, progress.prefs);
  verify.setPlay(verifying === null ? null : shown, playing, progress.prefs);
}
