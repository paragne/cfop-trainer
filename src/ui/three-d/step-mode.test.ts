import { describe, expect, it } from "vitest";
import { parse, stringify } from "../../lib/notation.ts";
import type { Move } from "../../lib/notation.ts";
import type { Player } from "./player.ts";
import { createStepMode, FAST_MOVE_MS } from "./step-mode.ts";

const SLOW = 400;

// A player whose moves finish when the test says so, so a step can be caught
// mid-animation.
function fakePlayer() {
  const played: { moves: string; ms: number | undefined }[] = [];
  const finishers: (() => void)[] = [];
  const player: Player = {
    snapTo: () => {},
    pause: () => {},
    resume: () => {},
    currentFrame: () => ({ cubies: [], inFlight: null }),
    play(moves: readonly Move[], ms?: number) {
      played.push({ moves: stringify(moves), ms });
      return new Promise<void>((resolve) => finishers.push(resolve));
    },
  };
  const finish = async () => {
    finishers.shift()?.();
    await Promise.resolve();
    await Promise.resolve();
  };
  return { player, played, finish };
}

function setup(alg = "R U R'") {
  const fake = fakePlayer();
  const steps: [number, number, number][] = [];
  let settled = 0;
  const mode = createStepMode(fake.player, {
    onSettled: () => settled++,
    onStep: (from, to, ms) => steps.push([from, to, ms]),
    durationMs: () => SLOW,
  });
  mode.load(parse(alg));
  return { ...fake, mode, steps, settled: () => settled };
}

describe("stepping inside the algorithm", () => {
  it("plays the next move forward, and the previous move inverted backward", async () => {
    const { mode, played, finish } = setup();
    mode.stepForward();
    await finish();
    mode.stepForward();
    await finish();
    mode.stepBackward();
    await finish();
    expect(played).toEqual([
      { moves: "R", ms: SLOW },
      { moves: "U", ms: SLOW },
      { moves: "U'", ms: SLOW },
    ]);
    expect(mode.boundary()).toBe(1);
  });

  it("reports each step's boundaries and duration as it begins", async () => {
    const { mode, steps, finish } = setup();
    mode.stepForward();
    expect(steps).toEqual([[0, 1, SLOW]]);
    await finish();
    mode.stepBackward();
    expect(steps).toEqual([[0, 1, SLOW], [1, 0, SLOW]]);
  });

  it("keeps only the latest request made while a move is animating", async () => {
    const { mode, played, finish } = setup();
    mode.stepForward();
    mode.stepForward();
    mode.stepBackward();
    expect(played).toHaveLength(1);
    await finish();
    expect(played.map((p) => p.moves)).toEqual(["R", "R'"]);
  });
});

describe("going full circle", () => {
  it("replays the whole algorithm backward, fast, when stepping forward from the end", async () => {
    const { mode, played, steps, finish } = setup();
    for (let i = 0; i < 3; i++) {
      mode.stepForward();
      await finish();
    }
    expect(mode.boundary()).toBe(3);
    mode.stepForward();
    expect(played[3]).toEqual({ moves: "R U' R'", ms: FAST_MOVE_MS });
    expect(steps[3]).toEqual([3, 0, FAST_MOVE_MS * 3]);
    await finish();
    expect(mode.boundary()).toBe(0);
  });

  it("replays the whole algorithm forward, fast, when stepping back from the start", async () => {
    const { mode, played, steps, finish } = setup();
    mode.stepBackward();
    expect(played[0]).toEqual({ moves: "R U R'", ms: FAST_MOVE_MS });
    expect(steps[0]).toEqual([0, 3, FAST_MOVE_MS * 3]);
    await finish();
    expect(mode.boundary()).toBe(3);
  });

  it("does nothing for an empty algorithm", () => {
    const { mode, played } = setup("");
    mode.stepForward();
    mode.stepBackward();
    expect(played).toEqual([]);
  });
});

describe("playAll", () => {
  it("chains every move at the current speed and stops at the end", async () => {
    const { mode, played, finish } = setup();
    mode.playAll();
    for (let i = 0; i < 3; i++) await finish();
    expect(played.map((p) => p.moves)).toEqual(["R", "U", "R'"]);
    expect(mode.boundary()).toBe(3);
    await finish();
    expect(played).toHaveLength(3);
  });

  it("is interrupted by a step of the user's own, once the current move settles", async () => {
    const { mode, played, finish } = setup();
    mode.playAll();
    mode.stepBackward();
    await finish();
    await finish();
    expect(played.map((p) => p.moves)).toEqual(["R", "R'"]);
    expect(mode.boundary()).toBe(0);
  });
});
