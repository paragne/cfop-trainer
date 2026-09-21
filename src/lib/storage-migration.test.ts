import { afterEach, describe, expect, it, vi } from "vitest";
import { ALL_CASES } from "../data/algorithms.ts";
import { defaultProgress, serialize } from "./progress.ts";
import { V1_BLOB } from "./progress-v1.fixture.ts";
import { importJson, load, save } from "./storage.ts";
import { stubStorage } from "./storage-stub.ts";

const NOW = 1_800_000_000_000;
const KEY = "cfop-trainer-v1";
const PRE_V2 = "cfop-trainer-v1:pre-v2";
const UNREADABLE = "cfop-trainer-v1:unreadable";

const CARD_IDS = ["f2l-easy-1", "f2l-connected-5", "oll-27", "oll-cross-dot", "pll-ua", "pll-corners-adjacent"];

afterEach(() => vi.unstubAllGlobals());

describe("load with a v1 blob stored", () => {
  it("returns the migrated progress, with nothing set aside as unreadable", () => {
    const data = stubStorage({ [KEY]: V1_BLOB });
    const { progress, problem } = load(ALL_CASES);
    expect(problem).toBeNull();
    expect(progress.prefs.sets.learn).toEqual(["F2L", "2-Look PLL"]);
    expect(Object.keys(progress.cards)).toEqual(CARD_IDS);
    expect(progress.cards["pll-ua"]).toMatchObject({ ease: 2.75, interval: 16, seen: 4, known: 4 });
    expect(progress.notes["oll-27"]).toBe("sune");
    expect(data.has(UNREADABLE)).toBe(false);
  });

  it("copies the exact v1 text to the pre-v2 key before anything is saved", () => {
    const data = stubStorage({ [KEY]: V1_BLOB });
    load(ALL_CASES);
    expect(data.get(PRE_V2)).toBe(V1_BLOB);
    expect(data.get(KEY)).toBe(V1_BLOB);
  });

  it("writes v2 on the first save and leaves the copy alone through later saves", () => {
    const data = stubStorage({ [KEY]: V1_BLOB });
    const { progress } = load(ALL_CASES);
    save(progress, NOW);
    save({ ...progress, notes: { ...progress.notes, "oll-27": "changed" } }, NOW + 1);
    expect(JSON.parse(data.get(KEY) ?? "")).toMatchObject({ version: 2 });
    expect(data.get(PRE_V2)).toBe(V1_BLOB);
    expect(load(ALL_CASES).problem).toBeNull();
    expect(data.get(PRE_V2)).toBe(V1_BLOB);
  });

  it("does not replace a copy that is already there when v1 is loaded again", () => {
    const data = stubStorage({ [KEY]: V1_BLOB });
    load(ALL_CASES);
    data.set(KEY, V1_BLOB.replace('"sune"', '"later"'));
    load(ALL_CASES);
    expect(data.get(PRE_V2)).toBe(V1_BLOB);
  });

  it("still loads when the copy cannot be written", () => {
    stubStorage({ [KEY]: V1_BLOB }, true);
    const { progress, problem } = load(ALL_CASES);
    expect(problem).toBeNull();
    expect(Object.keys(progress.cards)).toEqual(CARD_IDS);
  });
});

describe("load without a v1 blob", () => {
  it.each([
    ["a v2 blob", { [KEY]: serialize(defaultProgress(), NOW) }],
    ["nothing", {}],
  ])("writes no pre-v2 copy for %s", (_name, seed) => {
    const data = stubStorage(seed);
    load(ALL_CASES);
    expect(data.has(PRE_V2)).toBe(false);
  });
});

describe("importJson with a v1 export file", () => {
  const local = { ...defaultProgress(), notes: { "oll-27": "mine" } };

  it("replaces with the migrated file", () => {
    stubStorage();
    const result = importJson(V1_BLOB, "replace", local, ALL_CASES, NOW);
    expect(result).toMatchObject({ ok: true, dropped: 0, saved: true });
    if (!result.ok) return;
    expect(result.progress.prefs.sets.learn).toEqual(["F2L", "2-Look PLL"]);
    expect(Object.keys(result.progress.cards)).toEqual(CARD_IDS);
  });

  it("merges it in, keeping the local prefs and both notes", () => {
    stubStorage();
    const result = importJson(V1_BLOB, "merge", local, ALL_CASES, NOW);
    expect(result.ok && result.progress.prefs).toEqual(local.prefs);
    expect(result.ok && result.progress.notes["oll-27"]).toBe("mine\n\nsune");
    expect(result.ok && Object.keys(result.progress.cards)).toEqual(CARD_IDS);
  });

  it("does not touch the pre-v2 key: the file is the user's own copy", () => {
    const data = stubStorage();
    importJson(V1_BLOB, "replace", local, ALL_CASES, NOW);
    expect(data.has(PRE_V2)).toBe(false);
  });
});
