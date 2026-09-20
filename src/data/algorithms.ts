/**
 * Case definitions for the CFOP trainer.
 *
 * Source: Cube Academy algorithm sheets (F2L 41, 2-look OLL, 2-look PLL),
 * transcribed 2026-09-20 and pending manual verification.
 *
 * `display` preserves the original parenthesis and bracket grouping because the
 * grouping is a memorization aid. `moves` is the flat token string the parser
 * consumes. The two must describe the same sequence; the test suite enforces it.
 *
 * `videoUrl` is null everywhere pending J Perm timestamp links.
 */

export type Group = "F2L" | "OLL" | "PLL";

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
  return { id, group: "F2L", section, name: null, aliases: [], algs, mask, setup: null, videoUrl: null };
}

function a(display: string, moves: string): Alg {
  return { display, moves };
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
    section: "Finish OLL",
    name: "Chameleon",
    aliases: ["OLL 24"],
    algs: [a("(r U R' U') (r' F R F')", "r U R' U' r' F R F'")],
    mask: { kind: "oll-full" },
    setup: null,
    videoUrl: null,
  },
  {
    id: "oll-25",
    group: "OLL",
    section: "Finish OLL",
    name: "Bowtie",
    aliases: ["OLL 25"],
    algs: [a("F' (r U R' U') (r' F R)", "F' r U R' U' r' F R")],
    mask: { kind: "oll-full" },
    setup: null,
    videoUrl: null,
  },
  {
    id: "oll-23",
    group: "OLL",
    section: "Finish OLL",
    name: "Headlights",
    aliases: ["OLL 23"],
    algs: [a("R2 D (R' U2 R) D' (R' U2 R')", "R2 D R' U2 R D' R' U2 R'")],
    mask: { kind: "oll-full" },
    setup: null,
    videoUrl: null,
  },
];

export const PLL_CASES: Case[] = [
  // --- Solving Corners (2) ------------------------------------------------
  {
    id: "pll-corners-diagonal",
    group: "PLL",
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
