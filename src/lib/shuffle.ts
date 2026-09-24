export function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// How a session arranges its cases: shuffled, or left in the order given.
export type Orderer = <T>(items: readonly T[]) => T[];

export const orderer = (shuffled: boolean, random: () => number): Orderer =>
  shuffled ? (items) => shuffle(items, random) : (items) => [...items];
