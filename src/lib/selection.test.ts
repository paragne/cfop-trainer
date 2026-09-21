import { describe, expect, it } from "vitest";
import { inSets } from "./selection.ts";
import { mk } from "./session.fixture.ts";

const cases = [
  mk("f2l", ["F2L"]),
  mk("shared", ["2-Look OLL", "Full OLL"]),
  mk("full", ["Full OLL"]),
  mk("look", ["2-Look OLL"]),
];

describe("inSets", () => {
  it("keeps source order", () => {
    expect(inSets(cases, ["Full OLL", "F2L"]).map((c) => c.id)).toEqual(["f2l", "shared", "full"]);
  });

  it("lists a case in two chosen sets once", () => {
    expect(inSets(cases, ["2-Look OLL", "Full OLL"]).map((c) => c.id)).toEqual([
      "shared",
      "full",
      "look",
    ]);
  });

  it("matches a case on any one of its sets", () => {
    expect(inSets(cases, ["Full OLL"]).map((c) => c.id)).toEqual(["shared", "full"]);
  });

  it("is empty when no chosen set matches", () => {
    expect(inSets(cases, ["Full PLL"])).toEqual([]);
  });
});
