import { el, keyedButton } from "./dom.ts";

export function createSummary(onAgain: () => void, onHome: () => void) {
  const element = el("section", "summary");
  const result = el("p", "result");
  const again = keyedButton("primary", "Start another session", "space", onAgain);
  const home = el("button", "quiet", "Return Home");
  home.type = "button";
  home.addEventListener("click", onHome);
  element.append(el("h1", "", "Session complete"), result, again.node, home);

  return {
    element,
    render(text: string): void {
      result.textContent = text;
    },
  };
}
