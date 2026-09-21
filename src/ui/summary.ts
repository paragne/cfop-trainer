import type { Session } from "../lib/session.ts";
import { el, keyedButton } from "./dom.ts";

export function createSummary(onAgain: () => void) {
  const element = el("section", "summary");
  const result = el("p", "result");
  const again = keyedButton("primary", "Start another session", "space", onAgain);
  element.append(el("h1", "", "Session complete"), result, again.node);

  return {
    element,
    render(session: Session): void {
      result.textContent = `${session.firstTry} of ${session.total} known on the first try.`;
    },
  };
}
