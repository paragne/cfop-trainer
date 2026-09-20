const MOVE_NAMES = [
  "U", "D", "L", "R", "F", "B",
  "u", "d", "l", "r", "f", "b",
  "M", "E", "S",
  "x", "y", "z",
] as const;

const CLOSERS = new Map([
  ["(", ")"],
  ["[", "]"],
]);

export type MoveName = (typeof MOVE_NAMES)[number];

// `prime` is kept on half turns so that "U2'" round-trips through stringify.
export type Move = {
  readonly name: MoveName;
  readonly turns: 1 | 2;
  readonly prime: boolean;
};

type Group = { closer: string; moves: Move[] };

// Parentheses and brackets are memorization aids only, so groups flatten away.
// `(...)*N` is the one place they carry meaning.
export function parse(source: string): Move[] {
  const parents: Group[] = [];
  let current: Group = { closer: "", moves: [] };
  // A repeat is only valid directly after a group, so remember the last one closed.
  let closed: Move[] | null = null;
  let pos = 0;

  const error = (why: string) =>
    new Error(`${why} at offset ${pos} in "${source}"`);

  while (pos < source.length) {
    const ch = source[pos];
    const name = MOVE_NAMES.find((n) => n === ch);
    const closer = CLOSERS.get(ch);

    if (/\s/.test(ch)) {
      pos++;
    } else if (name !== undefined) {
      pos++;
      const turns = source[pos] === "2" ? 2 : 1;
      if (turns === 2) pos++;
      const prime = source[pos] === "'";
      if (prime) pos++;
      current.moves.push({ name, turns, prime });
      closed = null;
    } else if (closer !== undefined) {
      parents.push(current);
      current = { closer, moves: [] };
      closed = null;
      pos++;
    } else if (ch === ")" || ch === "]") {
      const parent = parents.pop();
      if (parent === undefined || current.closer !== ch) {
        throw error(`Unmatched "${ch}"`);
      }
      parent.moves.push(...current.moves);
      closed = current.moves;
      current = parent;
      pos++;
    } else if (ch === "*") {
      const digits = /^\d+/.exec(source.slice(pos + 1));
      if (closed === null) throw error("Repeat must follow a group");
      if (digits === null || Number(digits[0]) < 1) {
        throw error("Repeat needs a count of at least 1");
      }
      for (let i = 1; i < Number(digits[0]); i++) current.moves.push(...closed);
      closed = null;
      pos += 1 + digits[0].length;
    } else {
      throw error(`Unexpected "${ch}"`);
    }
  }

  if (parents.length > 0) throw error("Unclosed group");
  return current.moves;
}

export function stringify(moves: readonly Move[]): string {
  return moves
    .map((m) => `${m.name}${m.turns === 2 ? "2" : ""}${m.prime ? "'" : ""}`)
    .join(" ");
}

// A half turn is its own inverse, so it keeps its written form.
export function invert(moves: readonly Move[]): Move[] {
  return moves
    .toReversed()
    .map((m) => (m.turns === 2 ? m : { ...m, prime: !m.prime }));
}
