/**
 * Case definitions for the CFOP trainer.
 *
 * Source: Cube Academy algorithm sheets (F2L 41, 2-look OLL, 2-look PLL),
 * transcribed 2026-09-20 and pending manual verification. Full OLL comes from
 * the same site's full sheet, transcribed 2026-09-21, as is Full PLL.
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
// "F2L" is the Basic set. The id predates the other F2L sets and keys stored
// prefs, so it keeps its name; only the label says "Basic".
export const CASE_SETS = [
  "F2L",
  "Advanced F2L",
  "Expert F2L",
  "2-Look OLL",
  "2-Look PLL",
  "Full OLL",
  "Full PLL",
] as const;
export type CaseSet = (typeof CASE_SETS)[number];

export const SET_GROUP: Readonly<Record<CaseSet, Group>> = {
  F2L: "F2L",
  "Advanced F2L": "F2L",
  "Expert F2L": "F2L",
  "2-Look OLL": "OLL",
  "2-Look PLL": "PLL",
  "Full OLL": "OLL",
  "Full PLL": "PLL",
};

export type Mask =
  | { kind: "f2l"; slot: "FR" | "FL" }
  | { kind: "oll-edges" }
  | { kind: "oll-full" }
  | { kind: "pll-corners" }
  | { kind: "pll-full" };

// affectsOtherSlots marks an F2L alg that disturbs a slot besides its own, as
// J Perm's sheet highlights. It still solves the target pair over the cross,
// but may leave another slot unsolved, so it is never a case's algs[0].
export type Alg = { display: string; moves: string; affectsOtherSlots?: boolean };

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

// J Perm presents every Advanced case in the front-right slot. A setup is
// given only where algs[0] starts with a rotation: the picture is then the
// cube as seen after that rotation, and the setup reaches it with the rotation
// undone, so the 3D model and the 2D picture start from the same cube.
function f2lAdvanced(id: string, section: string, algs: Alg[], setup: string | null = null): Case {
  return { ...f2l(id, section, FR, algs), sets: ["Advanced F2L"], setup };
}

function f2lExpert(id: string, section: string, algs: Alg[], setup: string | null = null): Case {
  return { ...f2l(id, section, FR, algs), sets: ["Expert F2L"], setup };
}

function a(display: string, moves: string): Alg {
  return { display, moves };
}

// J Perm highlights these as affecting more than one slot.
function multi(display: string, moves: string): Alg {
  return { display, moves, affectsOtherSlots: true };
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

// The full PLL sheet names every case, so these keep the sheet's names. Its
// pictures pin each case exactly, and the algs were checked against them.
function pll(id: string, section: string, name: string, algs: Alg[], aliases: string[] = []): Case {
  return {
    id,
    group: "PLL",
    sets: ["Full PLL"],
    section,
    name,
    aliases,
    algs,
    mask: { kind: "pll-full" },
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
    a("y U l' U L U' L' U' l", "y U l' U L U' L' U' l"),
  ]),
  f2l("f2l-disconnected-2", "Disconnected Pairs", FR, [
    a("U' (R U2' R') [U2 R U' R']", "U' R U2' R' U2 R U' R'"),
    a("y l U2 L2' U' L2 U' l'", "y l U2 L2' U' L2 U' l'"),
  ]),
  f2l("f2l-disconnected-3", "Disconnected Pairs", FR, [
    a("U' (R U R') [U R U R']", "U' R U R' U R U R'"),
    a("U2 (R U' R') U' (R U R')", "U2 R U' R' U' R U R'"),
    multi("R' U R2 U R'", "R' U R2 U R'"),
  ]),
  f2l("f2l-disconnected-4", "Disconnected Pairs", FR, [
    a("U (R U2' R') [U R U' R']", "U R U2' R' U R U' R'"),
  ]),
  f2l("f2l-disconnected-5", "Disconnected Pairs", FR, [
    a("U2 (R U R') [U R U' R']", "U2 R U R' U R U' R'"),
    a("y F R U2 R' F'", "y F R U2 R' F'"),
  ]),
  f2l("f2l-disconnected-6", "Disconnected Pairs", FL, [
    a("U (L' U' L) [U2' L' U L]", "U L' U' L U2' L' U L"),
    a("y' U' r U' R' U R U r'", "y' U' r U' R' U R U r'"),
  ]),
  f2l("f2l-disconnected-7", "Disconnected Pairs", FL, [
    a("U (L' U2 L) [U2' L' U L]", "U L' U2 L U2' L' U L"),
    a("y' r' U2 R2 U R2' U r", "y' r' U2 R2 U R2' U r"),
  ]),
  f2l("f2l-disconnected-8", "Disconnected Pairs", FL, [
    a("U (L' U' L) [U' L' U' L]", "U L' U' L U' L' U' L"),
    a("U2 (L' U L) U (L' U' L)", "U2 L' U L U L' U' L"),
    multi("L U' L2' U' L", "L U' L2' U' L"),
  ]),
  f2l("f2l-disconnected-9", "Disconnected Pairs", FL, [
    a("U' (L' U2 L) [U' L' U L]", "U' L' U2 L U' L' U L"),
  ]),
  f2l("f2l-disconnected-10", "Disconnected Pairs", FL, [
    a("U2 (L' U' L) [U' L' U L]", "U2 L' U' L U' L' U L"),
    a("y' F' L' U2 L F", "y' F' L' U2 L F"),
  ]),

  // --- Corner in Slot (6) -------------------------------------------------
  f2l("f2l-corner-1", "Corner in Slot", FR, [
    a("U' (R' F R F') [R U R']", "U' R' F R F' R U R'"),
    a("(R' F' R) (U R U' R') F", "R' F' R U R U' R' F"),
    a("U' F' (R U R' U') (R' F R)", "U' F' R U R' U' R' F R"),
    a("y U' (L' U L) (F' L F L')", "y U' L' U L F' L F L'"),
    a("y2 U' M U L U' M' U L'", "y2 U' M U L U' M' U L'"),
    a("y' U' R' U M U' R U M'", "y' U' R' U M U' R U M'"),
  ]),
  f2l("f2l-corner-2", "Corner in Slot", FR, [
    a("(R U' R') [U R U' R']", "R U' R' U R U' R'"),
  ]),
  f2l("f2l-corner-3", "Corner in Slot", FR, [
    a("(R U R') [U' R U R']", "R U R' U' R U R'"),
    a("y M' (U' L' U L) (U' L' U l)", "y M' U' L' U L U' L' U l"),
    a("y (L F' L' F)*2", "y L F' L' F L F' L' F"),
  ]),
  f2l("f2l-corner-4", "Corner in Slot", FL, [
    a("U (L F' L' F) [L' U' L]", "U L F' L' F L' U' L"),
    a("(L F L') (U' L' U L) F'", "L F L' U' L' U L F'"),
    a("U F (L' U' L U) (L F' L')", "U F L' U' L U L F' L'"),
    a("y' U (R U' R') (F R' F' R)", "y' U R U' R' F R' F' R"),
    a("y2 U M U' R' U M' U' R", "y2 U M U' R' U M' U' R"),
    a("y U L U' M U L' U' M'", "y U L U' M U L' U' M'"),
  ]),
  f2l("f2l-corner-5", "Corner in Slot", FL, [
    a("(L' U L) [U' L' U L]", "L' U L U' L' U L"),
  ]),
  f2l("f2l-corner-6", "Corner in Slot", FL, [
    a("(L' U' L) [U L' U' L]", "L' U' L U L' U' L"),
    a("y' M' (U R U' R') (U R U' r')", "y' M' U R U' R' U R U' r'"),
    a("y' (R' F R F')*2", "y' R' F R F' R' F R F'"),
  ]),

  // --- Edge in Slot (6) ---------------------------------------------------
  f2l("f2l-edge-1", "Edge in Slot", FR, [
    a("(U R U' R')*3", "U R U' R' U R U' R' U R U' R'"),
  ]),
  f2l("f2l-edge-2", "Edge in Slot", FR, [
    a("U' (R' F R F') [R U' R']", "U' R' F R F' R U' R'"),
    a("(R U' R') (F' U2 F)", "R U' R' F' U2 F"),
    a("y' R' U R' F R F' R", "y' R' U R' F R F' R"),
    a("y' U' (R' U2 R) (f R f')", "y' U' R' U2 R f R f'"),
  ]),
  f2l("f2l-edge-3", "Edge in Slot", FR, [
    a("U' (R U' R') [U2 R U' R']", "U' R U' R' U2 R U' R'"),
    a("y U' (L' U' L) U2 (L' U' L)", "y U' L' U' L U2 L' U' L"),
    a("y U (L' U2 L) U' (L' U' L)", "y U L' U2 L U' L' U' L"),
  ]),
  f2l("f2l-edge-4", "Edge in Slot", FR, [
    a("U (R U R') [U2' R U R']", "U R U R' U2' R U R'"),
    a("U' (R U2 R') U (R U R')", "U' R U2 R' U R U R'"),
    a("y U (L' U L) U2 (L' U L)", "y U L' U L U2 L' U L"),
  ]),
  f2l("f2l-edge-5", "Edge in Slot", FR, [
    a("U2 (R U R') [F R' F' R]", "U2 R U R' F R' F' R"),
    a("y U' (F U F') U (L' U' L)", "y U' F U F' U L' U' L"),
    a("U M' (U R U' r') (R U' R')", "U M' U R U' r' R U' R'"),
    multi("U (R' U' F R F') (R U' R')", "U R' U' F R F' R U' R'"),
    a("y2 U2 (L U L') y' U' (L' U L)", "y2 U2 L U L' y' U' L' U L"),
    a("y2 U2 L U M U L' U' M'", "y2 U2 L U M U L' U' M'"),
    a("y' U' (f R f') U (R' U' R)", "y' U' f R f' U R' U' R"),
  ]),
  f2l("f2l-edge-6", "Edge in Slot", FR, [
    a("U2 (F' U' F) [U R U' R']", "U2 F' U' F U R U' R'"),
    a("U (F' U' F) U' (R U R')", "U F' U' F U' R U R'"),
    a("y U2 (L' U' L) (F' L F L')", "y U2 L' U' L F' L F L'"),
    a("y U' M' (U' L' U l) (L' U L)", "y U' M' U' L' U l L' U L"),
    multi("y U' (L U F' L' F) (L' U L)", "y U' L U F' L' F L' U L"),
    a("y' U2 (R' U' R) y U (R U' R')", "y' U2 R' U' R y U R U' R'"),
    a("y' U2 R' U' M U' R U M'", "y' U2 R' U' M U' R U M'"),
    a("y2 U (f' L' f) U' (L U L')", "y2 U f' L' f U' L U L'"),
  ]),

  // --- Connected Pairs (10) -----------------------------------------------
  f2l("f2l-connected-1", "Connected Pairs", FR, [
    a("(R U' R') (U R U' R') [U2 R U' R']", "R U' R' U R U' R' U2 R U' R'"),
    a("R' U2 R2 U R2' U R", "R' U2 R2 U R2' U R"),
    multi("R' U2 R2 U R'", "R' U2 R2 U R'"),
    a("y U L' U2 L U' y' R U R'", "y U L' U2 L U' y' R U R'"),
  ]),
  f2l("f2l-connected-2", "Connected Pairs", FR, [
    a("U' (R U' R') [U R U R']", "U' R U' R' U R U R'"),
  ]),
  f2l("f2l-connected-3", "Connected Pairs", FR, [
    a("(R U R') (U2 R U' R') [U R U' R']", "R U R' U2 R U' R' U R U' R'"),
    a("M U (L F' L') U' M'", "M U L F' L' U' M'"),
    multi("U' (R' U R) U' (R U R')", "U' R' U R U' R U R'"),
    a("y (L' U L) y' U2 (R U R')", "y L' U L y' U2 R U R'"),
    a("y' (R2' F R F' R) U2 (R' U R)", "y' R2' F R F' R U2 R' U R"),
    a("y2 (f' L f) U2 (L U L')", "y2 f' L f U2 L U L'"),
  ]),
  f2l("f2l-connected-4", "Connected Pairs", FR, [
    a("(R U2' R') [U' R U R']", "R U2' R' U' R U R'"),
  ]),
  f2l("f2l-connected-5", "Connected Pairs", FR, [
    a("U (R U' R') (U' R U' R') [U R U' R']", "U R U' R' U' R U' R' U R U' R'"),
    a("U (F R' F' R) U (R U R')", "U F R' F' R U R U R'"),
    multi("U2 (L F' L' F) (R U R')", "U2 L F' L' F R U R'"),
    a("y U L' U' (L2 F' L' F) (L' U L)", "y U L' U' L2 F' L' F L' U L"),
    a("y F' (U' L' U L) F (L' U L)", "y F' U' L' U L F L' U L"),
    multi("y' U2 R U' R' U' S R' S'", "y' U2 R U' R' U' S R' S'"),
  ]),
  f2l("f2l-connected-6", "Connected Pairs", FL, [
    a("(L' U L) (U' L' U L) [U2' L' U L]", "L' U L U' L' U L U2' L' U L"),
    a("L U2 L2' U' L2 U' L'", "L U2 L2' U' L2 U' L'"),
    multi("L U2 L2' U' L", "L U2 L2' U' L"),
    a("y' U' (R U2 R') U y (L' U' L)", "y' U' R U2 R' U y L' U' L"),
  ]),
  f2l("f2l-connected-7", "Connected Pairs", FL, [
    a("U (L' U L) [U' L' U' L]", "U L' U L U' L' U' L"),
  ]),
  f2l("f2l-connected-8", "Connected Pairs", FL, [
    a("(L' U' L) (U2' L' U L) [U' L' U L]", "L' U' L U2' L' U L U' L' U L"),
    a("M U' (R' F R) U M'", "M U' R' F R U M'"),
    multi("U (L U' L') U (L' U' L)", "U L U' L' U L' U' L"),
    a("y' (R U' R') y U2 (L' U' L)", "y' R U' R' y U2 L' U' L"),
    a("y (L2 F' L' F L') U2 (L U' L')", "y L2 F' L' F L' U2 L U' L'"),
    a("y2 (f R' f') U2 R' U' R", "y2 f R' f' U2 R' U' R"),
  ]),
  f2l("f2l-connected-9", "Connected Pairs", FL, [
    a("(L' U2 L) [U L' U' L]", "L' U2 L U L' U' L"),
  ]),
  f2l("f2l-connected-10", "Connected Pairs", FL, [
    a("U' (L' U L) (U L' U L) [U' L' U L]", "U' L' U L U L' U L U' L' U L"),
    a("U' (F' L F L') U' (L' U' L)", "U' F' L F L' U' L' U' L"),
    a("y' U' R U (R2' F R F') (R U' R')", "y' U' R U R2' F R F' R U' R'"),
    a("y' F (U R U' R') F' (R U' R')", "y' F U R U' R' F' R U' R'"),
    multi("y U2 L' U L U S' L S", "y U2 L' U L U S' L S"),
  ]),

  // --- Pieces in Slot (5) -------------------------------------------------
  f2l("f2l-slot-1", "Pieces in Slot", FR, [
    a("(R U' R') (U' R U R') [U2 R U' R']", "R U' R' U' R U R' U2 R U' R'"),
    a("y (L' U L) U' (L' U2' L U' L' U L)", "y L' U L U' L' U2' L U' L' U L"),
  ]),
  f2l("f2l-slot-2", "Pieces in Slot", FR, [
    a("(R U' R') (U R U2' R') [U R U' R']", "R U' R' U R U2' R' U R U' R'"),
    a("y (L' U L) U (L' U' L U2' L' U L)", "y L' U L U L' U' L U2' L' U L"),
  ]),
  f2l("f2l-slot-3", "Pieces in Slot", FR, [
    a("(R U' R') (U' R U' R') [d R' U' R]", "R U' R' U' R U' R' d R' U' R"),
    a("y (L' U L) (F R U2' R' F')", "y L' U L F R U2' R' F'"),
    a("(F' L' U2 L F) (R U R')", "F' L' U2 L F R U R'"),
    a("y' R2' F' U' F U R U' R", "y' R2' F' U' F U R U' R"),
    a("y2 L U' L U F U' F' L2'", "y2 L U' L U F U' F' L2'"),
  ]),
  f2l("f2l-slot-4", "Pieces in Slot", FR, [
    a("(R U R') (U' R U' R') [U2 y' R' U' R]", "R U R' U' R U' R' U2 y' R' U' R"),
    a("(R U' R') (F' L' U2 L F)", "R U' R' F' L' U2 L F"),
    a("y (F R U2' R' F') (L' U' L)", "y F R U2' R' F' L' U' L"),
    a("y2 L2 F U F' U' L' U L'", "y2 L2 F U F' U' L' U L'"),
    a("y' R' U R' U' F' U F R2", "y' R' U R' U' F' U F R2"),
  ]),
  f2l("f2l-slot-5", "Pieces in Slot", FR, [
    a("(R U' R') (d R' U2' R) [U R' U2' R]", "R U' R' d R' U2' R U R' U2' R"),
    a("R2' U2' F R2 F' U2' R' U R'", "R2' U2' F R2 F' U2' R' U R'"),
    a("y L2 U2 F' L2' F U2 L U' L", "y L2 U2 F' L2' F U2 L U' L"),
    a("y' (f R' f') U (R' U2' R) U (R' U2' R)", "y' f R' f' U R' U2' R U R' U2' R"),
    a("y2 (f' L f) U' (L U2 L') U' (L U2 L')", "y2 f' L f U' L U2 L' U' L U2 L'"),
  ]),

  // --- Advanced F2L, J Perm Section 2 (36) --------------------------------
  // Each cell's picture colors only the cross and the target corner, so a cell
  // can pool algorithms for loose-piece arrangements it does not distinguish.
  // Only algs that solve the displayed state are kept.
  f2lAdvanced("f2l-adv-edge-up-1", "White Sticker Faces Up", [
    a("U' R' U R2 U' R'", "U' R' U R2 U' R'"),
  ]),
  f2lAdvanced("f2l-adv-edge-up-2", "White Sticker Faces Up", [
    a("y U L U' L2' U L", "y U L U' L2' U L"),
  ], "y L' U' L2' U L' U' y'"),
  f2lAdvanced("f2l-adv-edge-up-3", "White Sticker Faces Up", [
    a("U2 (R' U R) U' (S R S')", "U2 R' U R U' S R S'"),
  ]),
  f2lAdvanced("f2l-adv-edge-up-4", "White Sticker Faces Up", [
    a("y U2 (L U' L') U (S' L' S)", "y U2 L U' L' U S' L' S"),
  ], "y S' L S U' L U L' U2 y'"),
  f2lAdvanced("f2l-adv-edge-up-5", "White Sticker Faces Up", [
    a("U2 L2' u L2 u' L2'", "U2 L2' u L2 u' L2'"),
    a("y U2 R2 u' R2' u R2", "y U2 R2 u' R2' u R2"),
    a("y' U2 L2' u' L2 u L2'", "y' U2 L2' u' L2 u L2'"),
    a("y2 U2 R2 u R2' u' R2", "y2 U2 R2 u R2' u' R2"),
  ]),
  f2lAdvanced("f2l-adv-edge-up-6", "White Sticker Faces Up", [
    a("L F' U F L'", "L F' U F L'"),
  ]),
  f2lAdvanced("f2l-adv-edge-side-1", "White Sticker Faces Side/Front", [
    a("R' U' R2 U R'", "R' U' R2 U R'"),
  ]),
  f2lAdvanced("f2l-adv-edge-side-2", "White Sticker Faces Side/Front", [
    a("y L U L2' U' L", "y L U L2' U' L"),
  ], "y L' U L2' U' L' y'"),
  f2lAdvanced("f2l-adv-edge-side-3", "White Sticker Faces Side/Front", [
    a("F D R D' F'", "F D R D' F'"),
    a("y' R u R u' R'", "y' R u R u' R'"),
  ]),
  f2lAdvanced("f2l-adv-edge-side-4", "White Sticker Faces Side/Front", [
    a("y F' D' L' D F", "y F' D' L' D F"),
    a("y2 L' u' L' u L", "y2 L' u' L' u L"),
  ], "y F' D' L D F y'"),
  f2lAdvanced("f2l-adv-edge-side-5", "White Sticker Faces Side/Front", [
    a("U' (L' U' L) (R U' R')", "U' L' U' L R U' R'"),
  ]),
  f2lAdvanced("f2l-adv-edge-side-6", "White Sticker Faces Side/Front", [
    a("y U (R U R') (L' U L)", "y U R U R' L' U L"),
  ], "y L' U' L R U' R' U' y'"),
  f2lAdvanced("f2l-adv-edge-side-7", "White Sticker Faces Side/Front", [
    a("(F U2 F') (R U R')", "F U2 F' R U R'"),
    a("y L U2 L' F U F'", "y L U2 L' F U F'"),
    a("y' R U2 R' f R f'", "y' R U2 R' f R f'"),
  ]),
  f2lAdvanced("f2l-adv-edge-side-8", "White Sticker Faces Side/Front", [
    a("y (F' U2 F) (L' U' L)", "y F' U2 F L' U' L"),
    a("R' U2 R F' U' F", "R' U2 R F' U' F"),
    a("y2 L' U2 L f' L' f", "y2 L' U2 L f' L' f"),
  ], "y L' U L F' U2 F y'"),
  f2lAdvanced("f2l-adv-edge-side-9", "White Sticker Faces Side/Front", [
    a("U (R U R') (L U L')", "U R U R' L U L'"),
  ]),
  f2lAdvanced("f2l-adv-edge-side-10", "White Sticker Faces Side/Front", [
    a("y U' (L' U' L) (R' U' R)", "y U' L' U' L R' U' R"),
  ], "y R' U R L' U L U y'"),
  f2lAdvanced("f2l-adv-edge-side-11", "White Sticker Faces Side/Front", [
    a("U2 F' (L U L') F", "U2 F' L U L' F"),
    a("y U2 L' (B U B') L", "y U2 L' B U B' L"),
    a("y' U2 R' (F U F') R", "y' U2 R' F U F' R"),
    a("y2 U2 f' U L U' f", "y2 U2 f' U L U' f"),
  ]),
  f2lAdvanced("f2l-adv-edge-side-12", "White Sticker Faces Side/Front", [
    a("y U2' F (R' U' R) F'", "y U2' F R' U' R F'"),
    a("U2' R (B' U' B) R'", "U2' R B' U' B R'"),
    a("y2 U2' L (F' U' F) L'", "y2 U2' L F' U' F L'"),
    a("y' U2 f U' R' U f'", "y' U2 f U' R' U f'"),
  ], "y F R' U R F' U2' y'"),
  f2lAdvanced("f2l-adv-corner-right-1", "Corner In The Right Slot", [
    a("U (R U' R') (L' U L)", "U R U' R' L' U L"),
  ]),
  f2lAdvanced("f2l-adv-corner-right-2", "Corner In The Right Slot", [
    a("y (L' U2 L) U' (L U L')", "y L' U2 L U' L U L'"),
  ], "y L U' L' U L' U2 L y'"),
  f2lAdvanced("f2l-adv-corner-right-3", "Corner In The Right Slot", [
    a("U2 (R U' R') U (L' U' L)", "U2 R U' R' U L' U' L"),
  ]),
  f2lAdvanced("f2l-adv-corner-right-4", "Corner In The Right Slot", [
    a("y U' L' U' L2 U2 L'", "y U' L' U' L2 U2 L'"),
  ], "y L U2 L2 U L U y'"),
  f2lAdvanced("f2l-adv-corner-right-5", "Corner In The Right Slot", [
    a("(R U R') U' (L' U L)", "R U R' U' L' U L"),
    a("y (S' L S)", "y S' L S"),
  ]),
  f2lAdvanced("f2l-adv-corner-right-6", "Corner In The Right Slot", [
    a("U' (R U R') (F U F')", "U' R U R' F U F'"),
    a("y U' (F U F') (L U L')", "y U' F U F' L U L'"),
  ]),
  f2lAdvanced("f2l-adv-corner-left-1", "Corner In The Left Slot", [
    a("y U' (L' U L) (R U' R')", "y U' L' U L R U' R'"),
  ], "y R U R' L' U' L U y'"),
  f2lAdvanced("f2l-adv-corner-left-2", "Corner In The Left Slot", [
    a("(R U2 R') U (R' U' R)", "R U2 R' U R' U' R"),
  ]),
  f2lAdvanced("f2l-adv-corner-left-3", "Corner In The Left Slot", [
    a("(F R' F' R) U (R' U2 R)", "F R' F' R U R' U2 R"),
  ]),
  f2lAdvanced("f2l-adv-corner-left-4", "Corner In The Left Slot", [
    a("U R U R2' U2 R", "U R U R2' U2 R"),
  ]),
  f2lAdvanced("f2l-adv-corner-left-5", "Corner In The Left Slot", [
    a("(S R' S')", "S R' S'"),
    a("y (L' U' L) U (R U' R')", "y L' U' L U R U' R'"),
  ]),
  f2lAdvanced("f2l-adv-corner-left-6", "Corner In The Left Slot", [
    a("y U (L' U' L) (F' U' F)", "y U L' U' L F' U' F"),
  ], "y F' U F L' U L U' y'"),
  f2lAdvanced("f2l-adv-corner-opposite-1", "Corner In The Opposite Slot", [
    a("U' (F' U F) (L U2 L')", "U' F' U F L U2 L'"),
    a("y U' (L' U L) U' (f R' f')", "y U' L' U L U' f R' f'"),
  ]),
  f2lAdvanced("f2l-adv-corner-opposite-2", "Corner In The Opposite Slot", [
    a("U (R U' R') U (f' L f)", "U R U' R' U f' L f"),
    a("y U (F U' F') (R' U2 R)", "y U F U' F' R' U2 R"),
  ]),
  f2lAdvanced("f2l-adv-corner-opposite-3", "Corner In The Opposite Slot", [
    a("(R U' R') (L U2 L')", "R U' R' L U2 L'"),
  ]),
  f2lAdvanced("f2l-adv-corner-opposite-4", "Corner In The Opposite Slot", [
    a("(R U R') (f' L f)", "R U R' f' L f"),
  ]),
  f2lAdvanced("f2l-adv-corner-opposite-5", "Corner In The Opposite Slot", [
    a("y (L F' L' F) (R' U2 R)", "y L F' L' F R' U2 R"),
  ], "y R' U2 R F' L F L' y'"),
  f2lAdvanced("f2l-adv-corner-opposite-6", "Corner In The Opposite Slot", [
    a("(R' F R F') (L U2 L')", "R' F R F' L U2 L'"),
  ]),
  // --- Expert F2L, J Perm Section 3 (17) ----------------------------------
  // Same pooling rule as Advanced: only algs that solve the displayed state.
  // corner-solved-5 and -6 are drawn on the sheet with the pair at the back
  // right; they are presented one whole-cube y from it so the target is FR.
  f2lExpert("f2l-exp-corner-solved-1", "Corner Is Solved", [
    a("R2 U' R2' U R2", "R2 U' R2' U R2"),
    a("y2 L2' U' L2 U L2'", "y2 L2' U' L2 U L2'"),
    a("y F' R' F2 R F", "y F' R' F2 R F"),
  ]),
  f2lExpert("f2l-exp-corner-solved-2", "Corner Is Solved", [
    a("f' R' U R f", "f' R' U R f"),
    a("y R' u' R u R", "y R' u' R u R"),
    a("y' L' u' L u L", "y' L' u' L u L"),
    a("y2 f' D' L D f", "y2 f' D' L D f"),
  ]),
  f2lExpert("f2l-exp-corner-solved-3", "Corner Is Solved", [
    a("y L2' U L2 U' L2'", "y L2' U L2 U' L2'"),
    a("y' R2 U R2' U' R2", "y' R2 U R2' U' R2"),
    a("F L F2' L' F'", "F L F2' L' F'"),
  ], "y L2' U L2 U' L2' y'"),
  f2lExpert("f2l-exp-corner-solved-4", "Corner Is Solved", [
    a("y f L U' L' f'", "y f L U' L' f'"),
    a("L u L' u' L'", "L u L' u' L'"),
    a("y2 R u R' u' R'", "y2 R u R' u' R'"),
    a("y' f D R' D' f'", "y' f D R' D' f'"),
  ], "y f L U L' f' y'"),
  f2lExpert("f2l-exp-corner-solved-5", "Corner Is Solved", [
    a("y' L2' u' L2 u L2'", "y' L2' u' L2 u L2'"),
    a("y2 R2 u R2' u' R2", "y2 R2 u R2' u' R2"),
    a("L2' u L2 u' L2'", "L2' u L2 u' L2'"),
    a("y R2 u' R2' u R2", "y R2 u' R2' u R2"),
  ], "y' L2' u' L2 u L2' y"),
  f2lExpert("f2l-exp-corner-solved-6", "Corner Is Solved", [
    a("y' (L' u' L) U (L' u L)", "y' L' u' L U L' u L"),
    a("y (R' u' R) U (R' u R)", "y R' u' R U R' u R"),
  ], "y' L' u' L U' L' u L y"),
  f2lExpert("f2l-exp-pair-wrong-1", "Pair In The Wrong Slot", [
    a("R' F R2 U' R2' F' R", "R' F R2 U' R2' F' R"),
  ]),
  f2lExpert("f2l-exp-pair-wrong-2", "Pair In The Wrong Slot", [
    a("y L F' L2' U L2 F L'", "y L F' L2' U L2 F L'"),
  ], "y L F' L2 U' L2' F L' y'"),
  f2lExpert("f2l-exp-pair-wrong-3", "Pair In The Wrong Slot", [
    a("R (L U2 L') R'", "R L U2 L' R'"),
    a("y L' (R' U2 R) L", "y L' R' U2 R L"),
  ]),
  f2lExpert("f2l-exp-flipped-1", "Flipped Edge & Corner In Adjacent Slot", [
    a("L F2' L' F U' F", "L F2' L' F U' F"),
    a("(L F' L' U' F) U' (R U R')", "L F' L' U' F U' R U R'"),
  ]),
  f2lExpert("f2l-exp-flipped-2", "Flipped Edge & Corner In Adjacent Slot", [
    a("y R' F2 R F' U F'", "y R' F2 R F' U F'"),
    a("y (R' F R U F') U (L' U' L)", "y R' F R U F' U L' U' L"),
  ], "y F U' F R' F2 R y'"),
  f2lExpert("f2l-exp-flipped-3", "Flipped Edge & Corner In Adjacent Slot", [
    a("(R' F R U' F') (R U' R')", "R' F R U' F' R U' R'"),
  ]),
  f2lExpert("f2l-exp-flipped-4", "Flipped Edge & Corner In Adjacent Slot", [
    a("y (L F' L' U F) (L' U L)", "y L F' L' U F L' U L"),
  ], "y L' U' L F' U' L F L' y'"),
  f2lExpert("f2l-exp-flipped-5", "Flipped Edge & Corner In Adjacent Slot", [
    a("(L' U L) (M' U R U' r') (R U' R')", "L' U L M' U R U' r' R U' R'"),
  ]),
  f2lExpert("f2l-exp-flipped-6", "Flipped Edge & Corner In Adjacent Slot", [
    a("y (R U' R') (M' U' L' U l) (L' U L)", "y R U' R' M' U' L' U l L' U L"),
  ], "y L' U' L l' U' L U M R U R' y'"),
  f2lExpert("f2l-exp-other-1", "Other Easy Cases", [
    a("(R' F R U' F') U (R U' R')", "R' F R U' F' U R U' R'"),
  ]),
  f2lExpert("f2l-exp-other-2", "Other Easy Cases", [
    a("y (L F' L' U F) U' (L' U L)", "y L F' L' U F U' L' U L"),
  ], "y L' U' L U F' U' L F L' y'"),
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
      a(
        "(R U R' U) R' U' (R2 U' R') U R' U R U2",
        "R U R' U R' U' R2 U' R' U R' U R U2",
      ),
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

  // --- Corners Only (3) --------------------------------------------------
  pll("pll-aa", "Corners Only", "Aa Perm", [
    a("x (R' U R') D2 (R U' R') D2 R2 x'", "x R' U R' D2 R U' R' D2 R2 x'"),
  ]),
  pll("pll-ab", "Corners Only", "Ab Perm", [
    a("x R2 D2 (R U R') D2(R U' R) x'", "x R2 D2 R U R' D2 R U' R x'"),
  ]),
  pll("pll-e", "Corners Only", "E Perm", [
    a(
      "x' (R U' R') D (R U R') D' (R U R') D (R U' R') D' x",
      "x' R U' R' D R U R' D' R U R' D R U' R' D' x",
    ),
  ]),

  // --- Adjacent Swap (6) -------------------------------------------------
  pll("pll-t", "Adjacent Swap", "T Perm", [
    a("(R U R' U') R' F (R2 U' R')U' (R U R' F')", "R U R' U' R' F R2 U' R' U' R U R' F'"),
  ]),
  pll("pll-f", "Adjacent Swap", "F Perm", [
    a(
      "R' U' F' (R U R' U') R' F (R2 U' R') U' (R U R') U R",
      "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R",
    ),
  ]),
  pll("pll-jb", "Adjacent Swap", "Jb Perm", [
    a("R U R' F' (R U R' U') R' F (R2 U' R')", "R U R' F' R U R' U' R' F R2 U' R'"),
  ]),
  pll("pll-ja", "Adjacent Swap", "Ja Perm", [
    a("x R2 (F R F' R) U2 (r' U r) U2 x'", "x R2 F R F' R U2 r' U r U2 x'"),
  ], ["L Perm"]),
  pll("pll-ra", "Adjacent Swap", "Ra Perm", [
    a("(R U' R' U') R U R D (R' U' R D') R' U2 R'", "R U' R' U' R U R D R' U' R D' R' U2 R'"),
  ]),
  pll("pll-rb", "Adjacent Swap", "Rb Perm", [
    a("(R' U2 R U2) R' F (R U R' U') R' F' R2", "R' U2 R U2 R' F R U R' U' R' F' R2"),
  ]),

  // --- Diagonal Swap (4) -------------------------------------------------
  pll("pll-y", "Diagonal Swap", "Y Perm", [
    a(
      "F (R U' R' U') R U R' F' (R U R' U') R' F R F'",
      "F R U' R' U' R U R' F' R U R' U' R' F R F'",
    ),
  ]),
  pll("pll-na", "Diagonal Swap", "Na Perm", [
    a(
      "(R U R' U) R U R' F' (R U R' U') R' F (R2 U' R') U2 R U' R'",
      "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'",
    ),
  ]),
  pll("pll-nb", "Diagonal Swap", "Nb Perm", [
    a(
      "(R' U R U') R' (F' U' F) R U (R' U' R U') f R f'",
      "R' U R U' R' F' U' F R U R' U' R U' f R f'",
    ),
  ]),
  pll("pll-v", "Diagonal Swap", "V Perm", [
    a(
      "(R' U R' U') R D' R' D R' (U D') R2 U' R2 D R2",
      "R' U R' U' R D' R' D R' U D' R2 U' R2 D R2",
    ),
  ]),

  // --- G-Perms (4) -------------------------------------------------------
  pll("pll-ga", "G-Perms", "Ga Perm", [
    a("R2 (U R' U R') U' R U' R2 (D U') R' U R D'", "R2 U R' U R' U' R U' R2 D U' R' U R D'"),
  ]),
  pll("pll-gb", "G-Perms", "Gb Perm", [
    a("D R' U' R (U D') R2 U R' U (R U' R U') R2", "D R' U' R U D' R2 U R' U R U' R U' R2"),
  ]),
  pll("pll-gc", "G-Perms", "Gc Perm", [
    a("D R2 (U' R U' R) U R' U R2 (D' U) R U' R'", "D R2 U' R U' R U R' U R2 D' U R U' R'"),
  ]),
  pll("pll-gd", "G-Perms", "Gd Perm", [
    a("R U R' (U' D) R2 U' R U' (R' U R' U) R2 D'", "R U R' U' D R2 U' R U' R' U R' U R2 D'"),
  ]),
];

export const ALL_CASES: Case[] = [...F2L_CASES, ...OLL_CASES, ...PLL_CASES];
