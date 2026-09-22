import { describe, expect, it } from "vitest";
import { ALL_CASES } from "../data/algorithms.ts";
import type { Case } from "../data/algorithms.ts";
import { renderSolution } from "./solution.ts";

const caseWith = (algs: string[], videoUrl: string | null): Case => ({
  id: "synthetic",
  group: "F2L",
  sets: ["F2L"],
  section: "",
  name: null,
  aliases: [],
  algs: algs.map((display) => ({ display, moves: "U" })),
  mask: { kind: "f2l", slot: "FR" },
  setup: null,
  videoUrl,
});

const anchors = (html: string) => html.match(/<a[\s>]/g)?.length ?? 0;

describe("the video link", () => {
  const url = "https://www.youtube.com/watch?v=abc&t=42s";
  const html = renderSolution(caseWith(["U"], url), "");

  it("renders exactly one anchor to the url, with & escaped in the attribute", () => {
    expect(anchors(html)).toBe(1);
    expect(html).toContain('href="https://www.youtube.com/watch?v=abc&amp;t=42s"');
  });

  it("opens in a new tab without leaking the opener or referrer", () => {
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("cannot be broken out of by a quote in the url", () => {
    const hostile = renderSolution(caseWith(["U"], 'https://x.test/" onmouseover="alert(1)'), "");
    expect(hostile).not.toMatch(/"\s*onmouseover/);
    expect(anchors(hostile)).toBe(1);
  });

  it("is absent when videoUrl is null", () => {
    expect(anchors(renderSolution(caseWith(["U"], null), ""))).toBe(0);
  });

  it("is absent for every case in the data that has no videoUrl", () => {
    for (const c of ALL_CASES.filter((c) => c.videoUrl === null)) {
      expect(anchors(renderSolution(c, "")), c.id).toBe(0);
    }
  });
});

describe("the algs", () => {
  it("lists every alg, primary first", () => {
    const html = renderSolution(caseWith(["R U R'", "F R F'", "L' U L"], null), "");
    expect(html.startsWith('<p class="alg primary">R U R\'</p>')).toBe(true);
    expect(html.indexOf("F R F'")).toBeLessThan(html.indexOf("L' U L"));
    expect(html.match(/class="alg alt"/g)).toHaveLength(2);
  });

  it("keeps parentheses and apostrophes readable", () => {
    expect(renderSolution(caseWith(["U' (R U R') [U2 R U' R']"], null), "")).toContain(
      "U' (R U R') [U2 R U' R']",
    );
  });

  it("escapes markup in every alg, alternates included", () => {
    const html = renderSolution(caseWith(["R <b>&</b>", "L <i>"], null), "");
    expect(html).not.toMatch(/<[bi]>/);
    expect(html).toContain("R &lt;b&gt;&amp;&lt;/b&gt;");
    expect(html).toContain("L &lt;i&gt;");
  });
});

describe("with an AUF", () => {
  it("prefixes every alg, alternates included, merging a leading U turn", () => {
    const html = renderSolution(caseWith(["R U R'", "U R"], null), "U'");
    expect(html).toContain(`<p class="alg primary">U' R U R'</p>`);
    expect(html).toContain('<p class="alg alt">R</p>');
  });

  it("changes nothing without one", () => {
    const c = caseWith(["U' (R U R')"], null);
    expect(renderSolution(c, "")).toContain("U' (R U R')");
  });
});
