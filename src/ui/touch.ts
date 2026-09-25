// A touch-primary device has no keyboard worth labeling buttons for, and the
// hotkey mode selector has nothing useful to offer it.
export function isTouchPrimary(): boolean {
  return matchMedia("(hover: none) and (pointer: coarse)").matches;
}
