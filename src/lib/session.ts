import type { Case } from "../data/algorithms.ts";
import type { Progress } from "./progress.ts";
import { buildQueue } from "./queue.ts";
import { grade, recount } from "./srs.ts";
import type { Card } from "./srs.ts";

export const SESSION_LENGTH = 20;

// Three other cards come between a failure and its retry: long enough that the
// answer is not simply still in mind.
const RETRY_GAP = 4;
const MAX_RETRIES = 2;

export type Session = {
  queue: readonly Case[];
  index: number;
  attempts: Readonly<Record<string, number>>;
  done: number;
  // Unique cases the session started with. A retry never grows it, so the
  // header counter's denominator holds still.
  total: number;
  firstTry: number;
  revealed: boolean;
};

export function startSession(
  cases: readonly Case[],
  progress: Progress,
  now: number,
  random: () => number,
): Session {
  const selected = cases.filter((c) => progress.prefs.groups.includes(c.group));
  const queue = buildQueue(selected, progress.cards, now, SESSION_LENGTH, random);
  return {
    queue,
    index: 0,
    attempts: {},
    done: 0,
    total: queue.length,
    firstTry: 0,
    revealed: progress.prefs.showSolutions,
  };
}

export function current(s: Session): Case | null {
  return s.index < s.queue.length ? s.queue[s.index] : null;
}

export function toggleReveal(s: Session): Session {
  return { ...s, revealed: !s.revealed };
}

export function answer(
  s: Session,
  progress: Progress,
  know: boolean,
  now: number,
): { session: Session; progress: Progress } {
  const c = current(s);
  if (c === null) throw new Error("answer called on a finished session");
  const attempt = s.attempts[c.id] ?? 0;
  const prev: Card | undefined = progress.cards[c.id];

  // Only a card's first attempt can move its long-term schedule, and a success
  // on a card that is not yet due is extra practice, not evidence it should
  // wait longer. Everything else only keeps the counters honest.
  const counterOnly = prev !== undefined && (attempt > 0 || (know && prev.due > now));
  const next = counterOnly ? recount(prev, know) : grade(prev ?? null, know, now);

  // toSpliced clamps a start past the end, so a retry near the end goes last.
  const retry = !know && attempt < MAX_RETRIES;
  const queue = retry ? s.queue.toSpliced(s.index + RETRY_GAP, 0, c) : s.queue;

  return {
    session: {
      queue,
      index: s.index + 1,
      attempts: { ...s.attempts, [c.id]: attempt + 1 },
      done: s.done + (retry ? 0 : 1),
      total: s.total,
      firstTry: s.firstTry + (attempt === 0 && know ? 1 : 0),
      revealed: progress.prefs.showSolutions,
    },
    progress: { ...progress, cards: { ...progress.cards, [c.id]: next } },
  };
}
