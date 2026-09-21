import { el } from "./dom.ts";

// Kept apart from the card so a save failure stays visible on the summary.
export function createStatus() {
  const element = el("p", "notice");
  element.setAttribute("role", "status");
  element.hidden = true;
  return {
    element,
    show(message: string | null): void {
      element.textContent = message ?? "";
      element.hidden = message === null;
    },
  };
}
