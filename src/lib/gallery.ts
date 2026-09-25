import type { Case, CaseSet } from "../data/algorithms.ts";
import type { Screen } from "./screen.ts";
import { inReadingOrder } from "./selection.ts";

// The gallery's cases grouped by section, in the order the home screen lists
// the sets. A case in two chosen sets appears once.
export function gallerySections(cases: readonly Case[], sets: readonly CaseSet[]): Map<string, Case[]> {
  const sections = new Map<string, Case[]>();
  for (const c of inReadingOrder(cases, sets)) {
    const title = `${c.group} · ${c.section}`;
    sections.set(title, [...(sections.get(title) ?? []), c]);
  }
  return sections;
}

export function openCase(screen: Screen, c: Case): Screen {
  if (screen.kind !== "gallery") throw new Error("case opened outside the gallery");
  return { kind: "gallery", open: c };
}

export function closeCase(screen: Screen): Screen {
  if (screen.kind !== "gallery") throw new Error("case closed outside the gallery");
  return { kind: "gallery", open: null };
}
