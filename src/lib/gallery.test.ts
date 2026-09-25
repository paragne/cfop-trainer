import { describe, expect, it } from "vitest";
import { CASE_SETS } from "../data/algorithms.ts";
import { closeCase, gallerySections, openCase } from "./gallery.ts";
import { defaultPrefs, readPrefs } from "./prefs.ts";
import { defaultProgress } from "./progress.ts";
import { cardView, press, start } from "./screen.ts";
import type { Action, Context, Screen } from "./screen.ts";
import { mk, NOW } from "./session.fixture.ts";

const a = { ...mk("a", ["2-Look OLL", "Full OLL"]), section: "Finish OLL" };
const b = { ...mk("b", ["Full OLL"]), section: "Finish OLL" };
const c = { ...mk("c", ["2-Look PLL"]), section: "Finish PLL" };
const cases = [c, b, a];

const ctx = (): Context => ({ progress: defaultProgress(), cases, now: NOW, random: () => 0.5 });

const titles = (sets: Parameters<typeof gallerySections>[1]) => [...gallerySections(cases, sets)].map(([t, cs]) => [t, cs.map((x) => x.id)]);

describe("gallerySections", () => {
  it("lists a case in two chosen sets once, with the earlier set", () => {
    expect(titles(["2-Look OLL", "Full OLL"])).toEqual([["OLL · Finish OLL", ["a", "b"]]]);
  });

  it("follows the home screen's set order, not the order the cases are stored in", () => {
    expect(titles(["2-Look PLL", "Full OLL"]).map(([t]) => t)).toEqual(["OLL · Finish OLL", "PLL · Finish PLL"]);
  });

  it("is empty when no set is chosen", () => {
    expect(gallerySections(cases, []).size).toBe(0);
  });
});

describe("gallery screen", () => {
  const grid = (): Screen => start("gallery", ctx());

  it("starts on the grid with no case open", () => {
    expect(grid()).toEqual({ kind: "gallery", open: null });
    expect(cardView(grid())).toBeNull();
  });

  it("goes from the home screen straight to the grid, past any intro", () => {
    const progress = { ...defaultProgress(), prefs: { ...defaultProgress().prefs, mode: "gallery" as const } };
    const next = press({ kind: "home" }, "reveal", { ...ctx(), progress });
    expect(next.screen).toEqual({ kind: "gallery", open: null });
  });

  it("opens a case as an always-revealed card and returns to the grid", () => {
    const open = openCase(grid(), a);
    expect(cardView(open)).toMatchObject({ c: a, revealed: true, mode: "gallery", auf: "" });
    expect(closeCase(open)).toEqual({ kind: "gallery", open: null });
  });

  it.each<Action>(["reveal", "know", "dontKnow", "next"])("%s changes nothing and records nothing", (action) => {
    const context = ctx();
    const open = openCase(grid(), a);
    const next = press(open, action, context);
    expect(next.screen).toBe(open);
    expect(next.progress).toBe(context.progress);
  });

  it("still lets the name toggle through, like any card", () => {
    const context = ctx();
    const next = press(openCase(grid(), a), "toggleNames", context);
    expect(next.progress.prefs.showNames).toBe(!context.progress.prefs.showNames);
    expect(next.progress.cards).toEqual({});
  });

  it("refuses to open or close a case off the gallery", () => {
    expect(() => openCase({ kind: "home" }, a)).toThrow();
    expect(() => closeCase({ kind: "home" })).toThrow();
  });
});

describe("gallery pref", () => {
  it("defaults to every set, and a stored blob without it takes that default", () => {
    expect(defaultPrefs().sets.gallery).toEqual([...CASE_SETS]);
    const { learn, drill, verify } = defaultPrefs().sets;
    expect(readPrefs({ sets: { learn, drill, verify } }).sets.gallery).toEqual([...CASE_SETS]);
  });

  it("keeps a stored selection, F2L included, and rejects an unknown set", () => {
    expect(readPrefs({ sets: { gallery: ["Expert F2L"] } }).sets.gallery).toEqual(["Expert F2L"]);
    expect(() => readPrefs({ sets: { gallery: ["Nope"] } })).toThrow();
  });
});
