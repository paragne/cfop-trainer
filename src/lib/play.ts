import type { Case } from "../data/algorithms.ts";
import { prefixed, turnState } from "./auf.ts";
import type { Auf } from "./auf.ts";
import { setupCube } from "./case-state.ts";
import type { Cube } from "./cube.ts";
import { parse } from "./notation.ts";
import type { Move } from "./notation.ts";
import { cardView } from "./screen.ts";
import type { Screen } from "./screen.ts";

export type PlayView = {
  // Changes whenever the 3D view must restart or close: another card, another
  // AUF, another alg chosen in Verify.
  key: string;
  c: Case;
  auf: Auf;
  moves: readonly Move[];
};

const viewOf = (c: Case, auf: Auf, alg: number): PlayView => ({
  key: `${c.id}|${auf}|${alg}`,
  c,
  auf,
  moves: parse(prefixed(auf, c.algs[alg].moves)),
});

// The only way into the 3D view. Playing reveals the solution, so this is null
// until the solution is shown: revealed in Learn and Drill, checked in Verify.
export function playView(screen: Screen): PlayView | null {
  if (screen.kind === "verify") {
    const { phase, current, auf, chosen } = screen.verify;
    return phase === "checked" || phase === "missed" ? viewOf(current, auf, chosen) : null;
  }
  const card = cardView(screen);
  return card !== null && card.revealed ? viewOf(card.c, card.auf, 0) : null;
}

// What the 2D picture shows before masking, so 3D starts from the same cube.
export const playStart = (c: Case, auf: Auf): Cube => turnState(setupCube(c), auf);
