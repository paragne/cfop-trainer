import type { Case } from "../data/algorithms.ts";
import { prefixed, turnState } from "./auf.ts";
import type { Auf } from "./auf.ts";
import { setupCube } from "./case-state.ts";
import type { Cube } from "./cube.ts";
import { parse } from "./notation.ts";
import type { Move } from "./notation.ts";
import { cardView } from "./screen.ts";
import type { Screen } from "./screen.ts";

// What a 3D picture of the card shows: the case at rest, which is the 2D
// picture's own information.
export type CaseView = {
  // Which card and turn of it this is: the 3D view reloads when it changes.
  key: string;
  c: Case;
  auf: Auf;
};

// The solution's moves too. Only what playView returns may carry them.
export type PlayView = CaseView & {
  // Which of the case's algs `moves` come from. Verify can switch it while the
  // 3D view is open, which restarts playback without reloading the card.
  alg: number;
  moves: readonly Move[];
};

const caseOf = (c: Case, auf: Auf): CaseView => ({ key: `${c.id}|${auf}`, c, auf });

// Verify shows its picture from the attempt on.
export function caseView(screen: Screen): CaseView | null {
  if (screen.kind === "verify") {
    const { phase, current, auf } = screen.verify;
    return phase === "ready" || phase === "done" ? null : caseOf(current, auf);
  }
  const card = cardView(screen);
  return card === null ? null : caseOf(card.c, card.auf);
}

const playOf = (c: Case, auf: Auf, alg: number): PlayView => ({
  ...caseOf(c, auf),
  alg,
  moves: parse(prefixed(auf, c.algs[alg].moves)),
});

// The only way to the solution's moves and the controls that play them, which
// reveal it: null until the solution is shown, so revealed in Learn and Drill,
// checked in Verify.
export function playView(screen: Screen): PlayView | null {
  if (screen.kind === "verify") {
    const { phase, current, auf, chosen } = screen.verify;
    return phase === "checked" || phase === "missed" ? playOf(current, auf, chosen) : null;
  }
  const card = cardView(screen);
  return card !== null && card.revealed ? playOf(card.c, card.auf, 0) : null;
}

// What the 2D picture shows before masking, so 3D starts from the same cube.
export const playStart = (c: Case, auf: Auf): Cube => turnState(setupCube(c), auf);
