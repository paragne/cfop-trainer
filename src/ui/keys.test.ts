import { describe, expect, it } from "vitest";
import { actionForKey, stepForKey } from "./keys.ts";
import type { Action } from "../lib/screen.ts";

const press = (key: string, over: Partial<{ typing: boolean; modifier: boolean; repeat: boolean; control: boolean }> = {}) =>
  actionForKey({ key, typing: false, modifier: false, repeat: false, ...over });

describe("actionForKey", () => {
  it.each<[string, Action]>([
    [" ", "reveal"],
    ["1", "dontKnow"],
    ["2", "know"],
    ["n", "toggleNames"],
    ["N", "toggleNames"],
    ["Enter", "next"],
  ])("maps %j to %s", (key, action) => {
    expect(press(key)).toBe(action);
  });

  it.each(["a", "3", "0", "Escape", "Tab", "ArrowLeft", "constructor"])(
    "ignores %j",
    (key) => {
      expect(press(key)).toBeNull();
    },
  );

  it.each([" ", "1", "2", "n"])("does nothing for %j while typing in a note", (key) => {
    expect(press(key, { typing: true })).toBeNull();
  });

  it.each([" ", "1", "2", "n"])("does nothing for %j with Ctrl, Cmd or Alt held", (key) => {
    expect(press(key, { modifier: true })).toBeNull();
  });

  it.each([" ", "1", "2", "n"])("does nothing for an auto-repeated %j", (key) => {
    expect(press(key, { repeat: true })).toBeNull();
  });
});

describe("Enter", () => {
  it("does nothing while typing in a note", () => {
    expect(press("Enter", { typing: true })).toBeNull();
  });

  it("does nothing on a focused button, link or field, where it already activates them", () => {
    expect(press("Enter", { control: true })).toBeNull();
  });

  it("leaves the other keys alone when a control has focus", () => {
    expect(press(" ", { control: true })).toBe("reveal");
  });
});

describe("stepForKey", () => {
  const arrow = (key: string, over: Partial<{ typing: boolean; modifier: boolean }> = {}) =>
    stepForKey({ key, typing: false, modifier: false, ...over });

  it("maps the arrows to steps", () => {
    expect(arrow("ArrowLeft")).toBe("back");
    expect(arrow("ArrowRight")).toBe("forward");
    expect(arrow("ArrowUp")).toBe("end");
    expect(arrow("ArrowDown")).toBe("start");
  });

  it.each([" ", "1", "2", "n", "a"])("ignores %j, so no other key steps", (key) => {
    expect(arrow(key)).toBeNull();
  });

  it.each(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"])("leaves %s to the caret while typing in a note", (key) => {
    expect(arrow(key, { typing: true })).toBeNull();
  });

  it.each(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"])("leaves %s alone with Ctrl, Cmd or Alt held", (key) => {
    expect(arrow(key, { modifier: true })).toBeNull();
  });

  it.each(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"])("keeps %s off every action, so it cannot collide with Space, 1, 2 or n", (key) => {
    expect(press(key)).toBeNull();
  });
});
