import { describe, expect, it } from "vitest";
import { parse } from "../../lib/notation.ts";
import { applyAlgToCubies, colorsAtCubies, homeCubies } from "../../lib/physical-cube.ts";
import { setup } from "./step-mode.fixture.ts";

describe("jumping to either end", () => {
  const home = colorsAtCubies(homeCubies());
  const after = (alg: string) => colorsAtCubies(applyAlgToCubies(homeCubies(), parse(alg)));

  it("snaps to the end without playing a move", async () => {
    const { mode, played, resting, finish } = setup();
    mode.stepForward();
    await finish();
    mode.goToEnd();
    expect(played).toHaveLength(1);
    expect(mode.boundary()).toBe(3);
    expect(resting()).toEqual(after("R U R'"));
  });

  it("snaps back to the start from the middle", async () => {
    const { mode, resting, finish } = setup();
    mode.stepForward();
    await finish();
    mode.stepForward();
    await finish();
    mode.goToStart();
    expect(mode.boundary()).toBe(0);
    expect(resting()).toEqual(home);
  });

  it("stops an auto-play, and reports one settle per jump", async () => {
    const { mode, played, settled, finish } = setup();
    mode.playAll();
    const before = settled();
    mode.goToEnd();
    await finish();
    expect(played).toHaveLength(1);
    expect(settled()).toBe(before + 2);
    expect(mode.boundary()).toBe(3);
  });

  it("waits for a move in flight to settle before jumping", async () => {
    const { mode, resting, finish } = setup();
    mode.stepForward();
    mode.goToEnd();
    expect(mode.boundary()).toBe(0);
    await finish();
    expect(mode.boundary()).toBe(3);
    expect(resting()).toEqual(after("R U R'"));
  });

  it("does nothing for an empty algorithm", () => {
    const { mode, settled } = setup("");
    const before = settled();
    mode.goToEnd();
    mode.goToStart();
    expect(settled()).toBe(before);
  });
});
