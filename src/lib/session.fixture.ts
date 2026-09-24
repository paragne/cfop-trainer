import { SET_GROUP } from "../data/algorithms.ts";
import type { Case, CaseSet } from "../data/algorithms.ts";
import type { Session } from "./session.ts";
import type { Card } from "./srs.ts";

export const NOW = 1_800_000_000_000;
export const DAY = 86_400_000;

export const mk = (id: string, sets: CaseSet[] = ["F2L"]): Case => ({
  id,
  group: SET_GROUP[sets[0]],
  sets,
  section: "",
  name: null,
  aliases: [],
  algs: [{ display: "U", moves: "U" }],
  mask: { kind: "f2l", slot: "FR" },
  setup: null,
  videoUrl: null,
});

export const card = (over: Partial<Card> = {}): Card => ({
  ease: 2.5,
  interval: 6,
  reps: 2,
  due: NOW - 1,
  seen: 4,
  known: 3,
  lastGrade: 1,
  ...over,
});

export const ids = (s: Session) => s.queue.map((c) => c.id);
