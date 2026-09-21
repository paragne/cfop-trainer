/**
 * Case definitions for the CFOP trainer.
 *
 * Source: Cube Academy algorithm sheets (F2L 41, 2-look OLL, 2-look PLL),
 * transcribed 2026-09-20 and pending manual verification. Full OLL comes from
 * the same site's full sheet, transcribed 2026-09-21.
 *
 * `display` preserves the original parenthesis and bracket grouping because the
 * grouping is a memorization aid. `moves` is the flat token string the parser
 * consumes. The two must describe the same sequence; the test suite enforces it.
 *
 * `videoUrl` is null everywhere pending J Perm timestamp links.
 */

export type Group = "F2L" | "OLL" | "PLL";

// A set is a membership tag, not a container: a case in two sets is still one
// case with one id and one SRS record.
export const CASE_SETS = ["F2L", "2-Look OLL", "2-Look PLL", "Full OLL", "Full PLL"] as const;
export type CaseSet = (typeof CASE_SETS)[number];

export type Mask =
  | { kind: "f2l"; slot: "FR" | "FL" }
  | { kind: "oll-edges" }
  | { kind: "oll-full" }
  | { kind: "pll-corners" }
  | { kind: "pll-full" };

export type Alg = { display: string; moves: string };

export type Case = {
  id: string;
  group: Group;
  sets: CaseSet[];
  section: string;
  name: string | null;
  aliases: string[];
  algs: Alg[];
  mask: Mask;
  setup: string | null;
  videoUrl: string | null;
};

const FR: Mask = { kind: "f2l", slot: "FR" };
const FL: Mask = { kind: "f2l", slot: "FL" };

function f2l(
  id: string,
  section: string,
  mask: Mask,
  algs: Alg[],
): Case {
  return { id, group: "F2L", sets: ["F2L"], section, name: null, aliases: [], algs, mask, setup: null, videoUrl: null };
}

function a(display: string, moves: string): Alg {
  return { display, moves };
}

// The full sheet carries no case names, so these are named by their standard
// number. The number was derived by matching orientation patterns against two
// public tables, not read off the sheet.
function oll(id: string, section: string, algs: Alg[]): Case {
  return {
    id,
    group: "OLL",
    sets: ["Full OLL"],
    section,
    name: `OLL ${id.slice("oll-".length)}`,
    aliases: [],
    algs,
    mask: { kind: "oll-full" },
    setup: null,
    videoUrl: null,
  };
}

export const F2L_CASES: Case[] = [
  // --- Easy Inserts (4) ---------------------------------------------------
  f2l("f2l-easy-1", "Easy Inserts", FR, [
    a("U (R U' R')", "U R U' R'"),
    a("(R' F R F')", "R' F R F'"),
  ]),
  f2l("f2l-easy-2", "Easy Inserts", FL, [
    a("U' (L' U L)", "U' L' U L"),
    a("(L F' L' F)", "L F' L' F"),
  ]),
  f2l("f2l-easy-3", "Easy Inserts", FR, [a("(R U R')", "R U R'")]),
  f2l("f2l-easy-4", "Easy Inserts", FL, [a("(L' U' L)", "L' U' L")]),

  // --- Disconnected Pairs (10) -------------------------------------------
  f2l("f2l-disconnected-1", "Disconnected Pairs", FR, [
    a("U' (R U R') [U2 R U' R']", "U' R U R' U2 R U' R'"),
  ]),
  f2l("f2l-disconnected-2", "Disconnected Pairs", FR, [
    a("U' (R U2' R') [U2 R U' R']", "U' R U2' R' U2 R U' R'"),
  ]),
  f2l("f2l-disconnected-3", "Disconnected Pairs", FR, [
    a("U' (R U R') [U R U R']", "U' R U R' U R U R'"),
  ]),
  f2l("f2l-disconnected-4", "Disconnected Pairs", FR, [
    a("U (R U2' R') [U R U' R']", "U R U2' R' U R U' R'"),
  ]),
  f2l("f2l-disconnected-5", "Disconnected Pairs", FR, [
    a("U2 (R U R') [U R U' R']", "U2 R U R' U R U' R'"),
  ]),
  f2l("f2l-disconnected-6", "Disconnected Pairs", FL, [
    a("U (L' U' L) [U2' L' U L]", "U L' U' L U2' L' U L"),
  ]),
  f2l("f2l-disconnected-7", "Disconnected Pairs", FL, [
    a("U (L' U2 L) [U2' L' U L]", "U L' U2 L U2' L' U L"),
  ]),
  f2l("f2l-disconnected-8", "Disconnected Pairs", FL, [
    a("U (L' U' L) [U' L' U' L]", "U L' U' L U' L' U' L"),
  ]),
  f2l("f2l-disconnected-9", "Disconnected Pairs", FL, [
    a("U' (L' U2 L) [U' L' U L]", "U' L' U2 L U' L' U L"),
  ]),
  f2l("f2l-disconnected-10", "Disconnected Pairs", FL, [
    a("U2 (L' U' L) [U' L' U L]", "U2 L' U' L U' L' U L"),
  ]),

  // --- Corner in Slot (6) -------------------------------------------------
  f2l("f2l-corner-1", "Corner in Slot", FR, [
    a("U' (R' F R F') [R U R']", "U' R' F R F' R U R'"),
  ]),
  f2l("f2l-corner-2", "Corner in Slot", FR, [
    a("(R U' R') [U R U' R']", "R U' R' U R U' R'"),
  ]),
  f2l("f2l-corner-3", "Corner in Slot", FR, [
    a("(R U R') [U' R U R']", "R U R' U' R U R'"),
  ]),
  f2l("f2l-corner-4", "Corner in Slot", FL, [
    a("U (L F' L' F) [L' U' L]", "U L F' L' F L' U' L"),
  ]),
  f2l("f2l-corner-5", "Corner in Slot", FL, [
    a("(L' U L) [U' L' U L]", "L' U L U' L' U L"),
  ]),
  f2l("f2l-corner-6", "Corner in Slot", FL, [
    a("(L' U' L) [U L' U' L]", "L' U' L U L' U' L"),
  ]),

  // --- Edge in Slot (6) ---------------------------------------------------
  f2l("f2l-edge-1", "Edge in Slot", FR, [
    a("(U R U' R')*3", "U R U' R' U R U' R' U R U' R'"),
  ]),
  f2l("f2l-edge-2", "Edge in Slot", FR, [
    a("U' (R' F R F') [R U' R']", "U' R' F R F' R U' R'"),
  ]),
  f2l("f2l-edge-3", "Edge in Slot", FR, [
    a("U' (R U' R') [U2 R U' R']", "U' R U' R' U2 R U' R'"),
  ]),
  f2l("f2l-edge-4", "Edge in Slot", FR, [
    a("U (R U R') [U2' R U R']", "U R U R' U2' R U R'"),
  ]),
  f2l("f2l-edge-5", "Edge in Slot", FR, [
    a("U2 (R U R') [F R' F' R]", "U2 R U R' F R' F' R"),
  ]),
  f2l("f2l-edge-6", "Edge in Slot", FR, [
    a("U2 (F' U' F) [U R U' R']", "U2 F' U' F U R U' R'"),
  ]),

  // --- Connected Pairs (10) -----------------------------------------------
  f2l("f2l-connected-1", "Connected Pairs", FR, [
    a("(R U' R') (U R U' R') [U2 R U' R']", "R U' R' U R U' R' U2 R U' R'"),
  ]),
  f2l("f2l-connected-2", "Connected Pairs", FR, [
    a("U' (R U' R') [U R U R']", "U' R U' R' U R U R'"),
  ]),
  f2l("f2l-connected-3", "Connected Pairs", FR, [
    a("(R U R') (U2 R U' R') [U R U' R']", "R U R' U2 R U' R' U R U' R'"),
  ]),
  f2l("f2l-connected-4", "Connected Pairs", FR, [
    a("(R U2' R') [U' R U R']", "R U2' R' U' R U R'"),
  ]),
  f2l("f2l-connected-5", "Connected Pairs", FR, [
    a("U (R U' R') (U' R U' R') [U R U' R']", "U R U' R' U' R U' R' U R U' R'"),
  ]),
  f2l("f2l-connected-6", "Connected Pairs", FL, [
    a("(L' U L) (U' L' U L) [U2' L' U L]", "L' U L U' L' U L U2' L' U L"),
  ]),
  f2l("f2l-connected-7", "Connected Pairs", FL, [
    a("U (L' U L) [U' L' U' L]", "U L' U L U' L' U' L"),
  ]),
  f2l("f2l-connected-8", "Connected Pairs", FL, [
    a("(L' U' L) (U2' L' U L) [U' L' U L]", "L' U' L U2' L' U L U' L' U L"),
  ]),
  f2l("f2l-connected-9", "Connected Pairs", FL, [
    a("(L' U2 L) [U L' U' L]", "L' U2 L U L' U' L"),
  ]),
  f2l("f2l-connected-10", "Connected Pairs", FL, [
    a("U' (L' U L) (U L' U L) [U' L' U L]", "U' L' U L U L' U L U' L' U L"),
  ]),

  // --- Pieces in Slot (5) -------------------------------------------------
  f2l("f2l-slot-1", "Pieces in Slot", FR, [
    a("(R U' R') (U' R U R') [U2 R U' R']", "R U' R' U' R U R' U2 R U' R'"),
  ]),
  f2l("f2l-slot-2", "Pieces in Slot", FR, [
    a("(R U' R') (U R U2' R') [U R U' R']", "R U' R' U R U2' R' U R U' R'"),
  ]),
  f2l("f2l-slot-3", "Pieces in Slot", FR, [
    a("(R U' R') (U' R U' R') [d R' U' R]", "R U' R' U' R U' R' d R' U' R"),
  ]),
  f2l("f2l-slot-4", "Pieces in Slot", FR, [
    a("(R U R') (U' R U' R') [U2 y' R' U' R]", "R U R' U' R U' R' U2 y' R' U' R"),
  ]),
  f2l("f2l-slot-5", "Pieces in Slot", FR, [
    a("(R U' R') (d R' U2' R) [U R' U2' R]", "R U' R' d R' U2' R U R' U2' R"),
  ]),
];

export const OLL_CASES: Case[] = [
  // --- Creating Cross: edge orientation (3) -------------------------------
  {
    id: "oll-cross-line",
    group: "OLL",
    sets: ["2-Look OLL"],
    section: "Creating Cross",
    name: "Line",
    aliases: ["Bar", "Horizontal Line"],
    algs: [a("F (R U R' U') F'", "F R U R' U' F'")],
    mask: { kind: "oll-edges" },
    setup: null,
    videoUrl: null,
  },
  {
    id: "oll-cross-l",
    group: "OLL",
    sets: ["2-Look OLL"],
    section: "Creating Cross",
    name: "L Shape",
    aliases: ["Backwards L", "Hook"],
    algs: [a("f (R U R' U') f'", "f R U R' U' f'")],
    mask: { kind: "oll-edges" },
    setup: null,
    videoUrl: null,
  },
  {
    id: "oll-cross-dot",
    group: "OLL",
    sets: ["2-Look OLL"],
    section: "Creating Cross",
    name: "Dot",
    aliases: [],
    algs: [
      a("F (R U R' U') F' f (R U R' U') f'", "F R U R' U' F' f R U R' U' f'"),
    ],
    mask: { kind: "oll-edges" },
    setup: null,
    videoUrl: null,
  },

  // --- Finish OLL: corner orientation (7) ---------------------------------
  {
    id: "oll-27",
    group: "OLL",
    sets: ["2-Look OLL", "Full OLL"],
    section: "Finish OLL",
    name: "Sune",
    aliases: ["OLL 27"],
    algs: [a("R U R' U (R U2 R')", "R U R' U R U2 R'")],
    mask: { kind: "oll-full" },
    setup: null,
    videoUrl: null,
  },
  {
    id: "oll-26",
    group: "OLL",
    sets: ["2-Look OLL", "Full OLL"],
    section: "Finish OLL",
    name: "Anti-Sune",
    aliases: ["OLL 26", "Antisune"],
    algs: [a("(R U2 R') U' R U' R'", "R U2 R' U' R U' R'")],
    mask: { kind: "oll-full" },
    setup: null,
    videoUrl: null,
  },
  {
    id: "oll-21",
    group: "OLL",
    sets: ["2-Look OLL", "Full OLL"],
    section: "Finish OLL",
    name: "H",
    aliases: ["OLL 21", "Double Sune"],
    algs: [
      a("R U R' U (R U' R' U) R U2 R'", "R U R' U R U' R' U R U2 R'"),
    ],
    mask: { kind: "oll-full" },
    setup: null,
    videoUrl: null,
  },
  {
    id: "oll-22",
    group: "OLL",
    sets: ["2-Look OLL", "Full OLL"],
    section: "Finish OLL",
    name: "Pi",
    aliases: ["OLL 22", "Bruno"],
    algs: [a("R U2 (R2 U') (R2 U') R2 U2 R", "R U2 R2 U' R2 U' R2 U2 R")],
    mask: { kind: "oll-full" },
    setup: null,
    videoUrl: null,
  },
  {
    id: "oll-24",
    group: "OLL",
    sets: ["2-Look OLL", "Full OLL"],
    section: "Finish OLL",
    name: "Chameleon",
    aliases: ["OLL 24"],
    algs: [
      a("(r U R' U') (r' F R F')", "r U R' U' r' F R F'"),
      a("U (R U R) D (R' U' R) D' R2", "U R U R D R' U' R D' R2"),
    ],
    mask: { kind: "oll-full" },
    setup: null,
    videoUrl: null,
  },
  {
    id: "oll-25",
    group: "OLL",
    sets: ["2-Look OLL", "Full OLL"],
    section: "Finish OLL",
    name: "Bowtie",
    aliases: ["OLL 25"],
    algs: [
      a("F' (r U R' U') (r' F R)", "F' r U R' U' r' F R"),
      a("U R2 D' (R U' R') D (R U R)", "U R2 D' R U' R' D R U R"),
    ],
    mask: { kind: "oll-full" },
    setup: null,
    videoUrl: null,
  },
  {
    id: "oll-23",
    group: "OLL",
    sets: ["2-Look OLL", "Full OLL"],
    section: "Finish OLL",
    name: "Headlights",
    aliases: ["OLL 23"],
    algs: [a("R2 D (R' U2 R) D' (R' U2 R')", "R2 D R' U2 R D' R' U2 R'")],
    mask: { kind: "oll-full" },
    setup: null,
    videoUrl: null,
  },

  // --- T Shapes (2) --------------------------------------------------------
  oll("oll-45", "T Shapes", [a("F (R U R' U') F'", "F R U R' U' F'")]),
  oll("oll-33", "T Shapes", [a("(R U R' U') (R' F R F')", "R U R' U' R' F R F'")]),

  // --- Block Shapes (2) ----------------------------------------------------
  oll("oll-6", "Block Shapes", [a("(r U2 R') U' R U' r'", "r U2 R' U' R U' r'")]),
  oll("oll-5", "Block Shapes", [a("(r' U2 R) U R' U r", "r' U2 R U R' U r")]),

  // --- Edges Only (2) ------------------------------------------------------
  oll("oll-28", "Edges Only", [a("(r U R' U') M (U R U' R')", "r U R' U' M U R U' R'")]),
  oll("oll-57", "Edges Only", [a("(R U R' U') M' (U R U' r')", "R U R' U' M' U R U' r'")]),

  // --- Lightning Shapes (6) ------------------------------------------------
  oll("oll-7", "Lightning Shapes", [a("r U R' U (R U2 r')", "r U R' U R U2 r'")]),
  oll("oll-8", "Lightning Shapes", [a("R' F' (r U' r') F2 R", "R' F' r U' r' F2 R")]),
  oll("oll-11", "Lightning Shapes", [
    a("r' (R2 U R' U R U2 R') U M'", "r' R2 U R' U R U2 R' U M'"),
  ]),
  oll("oll-12", "Lightning Shapes", [
    a("r (R2 U' R U' R' U2 R) U' M", "r R2 U' R U' R' U2 R U' M"),
  ]),
  oll("oll-40", "Lightning Shapes", [a("(f R' F' R) (U R U' R') S'", "f R' F' R U R U' R' S'")]),
  oll("oll-39", "Lightning Shapes", [a("f' (r U r' U') (r' F r S)", "f' r U r' U' r' F r S")]),

  // --- P Shapes (4) --------------------------------------------------------
  oll("oll-44", "P Shapes", [a("F (U R U' R') F'", "F U R U' R' F'")]),
  oll("oll-43", "P Shapes", [a("R' (U' F' U F) R", "R' U' F' U F R")]),
  oll("oll-31", "P Shapes", [a("R' U' F (U R U' R') F' R", "R' U' F U R U' R' F' R")]),
  oll("oll-32", "P Shapes", [a("S (R U R' U') (R' F R f')", "S R U R' U' R' F R f'")]),

  // --- C Shapes (2) --------------------------------------------------------
  oll("oll-46", "C Shapes", [a("R' U' (R' F R F') U R", "R' U' R' F R F' U R")]),
  oll("oll-34", "C Shapes", [a("f R f' U' r' U' R U M'", "f R f' U' r' U' R U M'")]),

  // --- Fish Shapes (4) -----------------------------------------------------
  oll("oll-37", "Fish Shapes", [a("(F R' F' R) (U R U' R')", "F R' F' R U R U' R'")]),
  oll("oll-35", "Fish Shapes", [a("R U2 R2' (F R F' R) U2 R'", "R U2 R2' F R F' R U2 R'")]),
  oll("oll-9", "Fish Shapes", [
    a("(R U R' U') R' F (R2 U R' U') F'", "R U R' U' R' F R2 U R' U' F'"),
  ]),
  oll("oll-10", "Fish Shapes", [a("R U R' U (R' F R F') R U2 R'", "R U R' U R' F R F' R U2 R'")]),

  // --- W Shapes (2) --------------------------------------------------------
  oll("oll-38", "W Shapes", [
    a("(R U R' U) R U' R' U' (R' F R F')", "R U R' U R U' R' U' R' F R F'"),
  ]),
  oll("oll-36", "W Shapes", [
    a("(L' U' L U') L' U L U (r U' r' F)", "L' U' L U' L' U L U r U' r' F"),
  ]),

  // --- Hook Shapes (6) -----------------------------------------------------
  oll("oll-48", "Hook Shapes", [a("F (R U R' U') (R U R' U') F'", "F R U R' U' R U R' U' F'")]),
  oll("oll-47", "Hook Shapes", [
    a("(F R' F' R) U2 (R U' R' U) R U2 R'", "F R' F' R U2 R U' R' U R U2 R'"),
  ]),
  oll("oll-54", "Hook Shapes", [a("r U R' U (R U' R' U) R U2 r'", "r U R' U R U' R' U R U2 r'")]),
  oll("oll-53", "Hook Shapes", [
    a("r' U' R U' (R' U R U') R' U2 r", "r' U' R U' R' U R U' R' U2 r"),
  ]),
  oll("oll-49", "Hook Shapes", [a("r U' (r2' U) (r2 U) r2' U' r", "r U' r2' U r2 U r2' U' r")]),
  oll("oll-50", "Hook Shapes", [a("r' U (r2 U') (r2' U') r2 U r'", "r' U r2 U' r2' U' r2 U r'")]),

  // --- Line Shapes (4) -----------------------------------------------------
  oll("oll-51", "Line Shapes", [a("F (U R U' R') (U R U' R') F'", "F U R U' R' U R U' R' F'")]),
  oll("oll-52", "Line Shapes", [a("R' (F' U' F U') R U R' U R", "R' F' U' F U' R U R' U R")]),
  oll("oll-56", "Line Shapes", [
    a("r U r' (U R U' R') (U R U' R') r U' r'", "r U r' U R U' R' U R U' R' r U' r'"),
  ]),
  oll("oll-55", "Line Shapes", [
    a("R' F (R U R U') R2 F' R2 U' R' U (R U R')", "R' F R U R U' R2 F' R2 U' R' U R U R'"),
  ]),

  // --- L Shapes (4) --------------------------------------------------------
  oll("oll-16", "L Shapes", [a("r U r' (R U R' U') r U' r'", "r U r' R U R' U' r U' r'")]),
  oll("oll-15", "L Shapes", [a("R' F' R (L' U' L U) R' F R", "R' F' R L' U' L U R' F R")]),
  oll("oll-13", "L Shapes", [a("(F U R U') R2 F' R (U R U' R')", "F U R U' R2 F' R U R U' R'")]),
  oll("oll-14", "L Shapes", [a("R' F (R U R') F' R (F U' F')", "R' F R U R' F' R F U' F'")]),

  // --- Awkward Shapes (4) --------------------------------------------------
  oll("oll-29", "Awkward Shapes", [
    a("r2 D' (r U r') D r2 U' (r' U' r)", "r2 D' r U r' D r2 U' r' U' r"),
  ]),
  oll("oll-30", "Awkward Shapes", [
    a("F U (R U2 R' U')(R U2 R' U') F'", "F U R U2 R' U' R U2 R' U' F'"),
  ]),
  oll("oll-41", "Awkward Shapes", [
    a("(R U R' U R U2 R')F (R U R' U') F'", "R U R' U R U2 R' F R U R' U' F'"),
  ]),
  oll("oll-42", "Awkward Shapes", [a("R' U' F2 u' (R U R') D R2 B", "R' U' F2 u' R U R' D R2 B")]),

  // --- Dot Cases (8) -------------------------------------------------------
  oll("oll-1", "Dot Cases", [a("R U2 (R2 F R F') U2 (R' F R F')", "R U2 R2 F R F' U2 R' F R F'")]),
  oll("oll-2", "Dot Cases", [a("f (U R U' R') S' (U R U' R') F'", "f U R U' R' S' U R U' R' F'")]),
  oll("oll-17", "Dot Cases", [a("(F R' F' R) U S' (R U' R') S", "F R' F' R U S' R U' R' S")]),
  oll("oll-19", "Dot Cases", [a("S' (R U R') S U' (R' F R F')", "S' R U R' S U' R' F R F'")]),
  oll("oll-18", "Dot Cases", [
    a("(r U R' U R U2 r')(r' U' R U' R' U2 r)", "r U R' U R U2 r' r' U' R U' R' U2 r"),
  ]),
  oll("oll-4", "Dot Cases", [
    a("(R' F2 R2 U2 R') F'(R U2 R2 F2 R)", "R' F2 R2 U2 R' F' R U2 R2 F2 R"),
  ]),
  oll("oll-3", "Dot Cases", [
    a("(R' F2 R2 U2 R') F (R U2 R2 F2 R)", "R' F2 R2 U2 R' F R U2 R2 F2 R"),
  ]),
  oll("oll-20", "Dot Cases", [a("S R' U' (R U) (R U) R U' R' S'", "S R' U' R U R U R U' R' S'")]),
];

export const PLL_CASES: Case[] = [
  // --- Solving Corners (2) ------------------------------------------------
  {
    id: "pll-corners-diagonal",
    group: "PLL",
    sets: ["2-Look PLL"],
    section: "Solving Corners",
    name: "No Headlights",
    aliases: ["Y Perm", "Diagonal Swap"],
    algs: [
      a(
        "F (R U' R' U') R U R' F' (R U R' U') R' F R F'",
        "F R U' R' U' R U R' F' R U R' U' R' F R F'",
      ),
    ],
    mask: { kind: "pll-corners" },
    setup: null,
    videoUrl: null,
  },
  {
    id: "pll-corners-adjacent",
    group: "PLL",
    sets: ["2-Look PLL"],
    section: "Solving Corners",
    name: "Headlights",
    aliases: ["T Perm", "Adjacent Swap"],
    algs: [
      a(
        "(R U R' U') R' F (R2 U' R') U' (R U R' F')",
        "R U R' U' R' F R2 U' R' U' R U R' F'",
      ),
    ],
    mask: { kind: "pll-corners" },
    setup: null,
    videoUrl: null,
  },

  // --- Finish PLL: edge permutation (4) -----------------------------------
  {
    id: "pll-ua",
    group: "PLL",
    sets: ["2-Look PLL", "Full PLL"],
    section: "Finish PLL",
    name: "Ua Perm",
    aliases: ["U Perm (a)"],
    algs: [
      a("(R2 U' R') U' R (U R) (U R) U' R", "R2 U' R' U' R U R U R U' R"),
    ],
    mask: { kind: "pll-full" },
    setup: null,
    videoUrl: null,
  },
  {
    id: "pll-ub",
    group: "PLL",
    sets: ["2-Look PLL", "Full PLL"],
    section: "Finish PLL",
    name: "Ub Perm",
    aliases: ["U Perm (b)"],
    algs: [
      a("R' U (R' U') (R' U') R' U (R U R2)", "R' U R' U' R' U' R' U R U R2"),
    ],
    mask: { kind: "pll-full" },
    setup: null,
    videoUrl: null,
  },
  {
    id: "pll-h",
    group: "PLL",
    sets: ["2-Look PLL", "Full PLL"],
    section: "Finish PLL",
    name: "H Perm",
    aliases: [],
    algs: [a("M2 U' (M2 U2 M2) U' M2", "M2 U' M2 U2 M2 U' M2")],
    mask: { kind: "pll-full" },
    setup: null,
    videoUrl: null,
  },
  {
    id: "pll-z",
    group: "PLL",
    sets: ["2-Look PLL", "Full PLL"],
    section: "Finish PLL",
    name: "Z Perm",
    aliases: [],
    algs: [
      a("M' U' (M2 U') (M2 U') M' U2 M2", "M' U' M2 U' M2 U' M' U2 M2"),
    ],
    mask: { kind: "pll-full" },
    setup: null,
    videoUrl: null,
  },
];

export const ALL_CASES: Case[] = [...F2L_CASES, ...OLL_CASES, ...PLL_CASES];
