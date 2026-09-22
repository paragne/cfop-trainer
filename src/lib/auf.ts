import type { Case } from "../data/algorithms.ts";
import { applyMoves } from "./cube.ts";
import { invert, parse } from "./notation.ts";

// The turn the solver makes before the algorithm. The picture is turned by its
// inverse, so `auf + alg` solves it by construction. Only U turns are offered:
// they leave the centers home, where a y would need normalizing.
export const AUFS = ["", "U", "U'", "U2"] as const;
export type Auf = (typeof AUFS)[number];

// A U turn on an F2L picture would show a different case, not the same one from
// another angle, since the U layer is part of what defines the pair.
export function pickAuf(c: Case, enabled: boolean, random: () => number): Auf {
  if (!enabled || c.group === "F2L") return "";
  return AUFS[Math.floor(random() * AUFS.length)];
}

export function turnState<T>(state: readonly T[], auf: Auf): T[] {
  return applyMoves(state, invert(parse(auf)));
}

// Bare U turns, up to whatever follows: a space, a group or the end.
const LEADING_U = /^(?:\s*U2?'?(?=[\s([]|$))+/;
const NET_TURN = ["", "U", "U2", "U'"];

const quarters = (token: string) => (token.includes("2") ? 2 : token.endsWith("'") ? 3 : 1);

// Merges the AUF with the U turns that open the text, so "U'" before "U R" is
// "R" and not "U' U R". A group opening the text stops the merge, since the
// turn inside it belongs to the grouping.
export function prefixed(auf: Auf, text: string): string {
  if (auf === "") return text;
  const lead = LEADING_U.exec(text)?.[0] ?? "";
  const turns = [auf, ...(lead.match(/U2?'?/g) ?? [])];
  const net = NET_TURN[turns.reduce((sum, token) => sum + quarters(token), 0) % 4];
  return [net, text.slice(lead.length).trim()].filter((part) => part !== "").join(" ");
}
