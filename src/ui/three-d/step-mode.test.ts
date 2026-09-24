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
  const reporters: ((index: number, fraction: number) => void)[] = [];
  const player: Player = {
    snapTo: () => {},
    pause: () => {},
    resume: () => {},
    currentFrame: () => ({ cubies: [], inFlight: null }),
    play(moves: readonly Move[], ms?: number, onProgress?: (index: number, fraction: number) => void) {
      played.push({ moves: stringify(moves), ms });
      if (onProgress !== undefined) reporters.push(onProgress);
      return new Promise<void>((resolve) => finishers.push(resolve));
    },
  };
  const finish = async () => {
    finishers.shift()?.();
    await Promise.resolve();
    await Promise.resolve();
  };
  // Reports that move `index` of the latest play is `fraction` of the way turned.
  const turn = (index: number, fraction: number) => reporters[reporters.length - 1]?.(index, fraction);
  return { player, played, finish, turn };
}

function setup(alg = "R U R'") {
  const fake = fakePlayer();
  const positions: number[] = [];
  let settled = 0;
  const mode = createStepMode(fake.player, {
    onSettled: () => settled++,
    onProgress: (boundary) => positions.push(boundary),
    durationMs: () => SLOW,
  });
  mode.load(parse(alg));
  return { ...fake, mode, positions, settled: () => settled };
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

  it("reports the marker's place between boundaries while a move turns, forward and back", async () => {
    const { mode, positions, turn, finish } = setup();
    mode.stepForward();
    turn(0, 0.25);
    turn(0, 1);
    await finish();
    mode.stepBackward();
    turn(0, 0.5);
    expect(positions).toEqual([0.25, 1, 0.5]);
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
    const { mode, played, positions, turn, finish } = setup();
    for (let i = 0; i < 3; i++) {
      mode.stepForward();
      await finish();
    }
    expect(mode.boundary()).toBe(3);
    mode.stepForward();
    expect(played[3]).toEqual({ moves: "R U' R'", ms: FAST_MOVE_MS });
    // The marker passes over each move in turn, last to first.
    positions.length = 0;
    turn(0, 0.5);
    turn(1, 0);
    turn(2, 1);
    expect(positions).toEqual([2.5, 2, 0]);
    await finish();
    expect(mode.boundary()).toBe(0);
  });

  it("replays the whole algorithm forward, fast, when stepping back from the start", async () => {
    const { mode, played, positions, turn, finish } = setup();
    mode.stepBackward();
    expect(played[0]).toEqual({ moves: "R U R'", ms: FAST_MOVE_MS });
    turn(0, 0.5);
    turn(1, 0);
    turn(2, 1);
    expect(positions).toEqual([0.5, 1, 3]);
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
