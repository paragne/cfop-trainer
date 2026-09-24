import type { Case } from "../data/algorithms.ts";
import { parseProgress } from "../lib/progress.ts";
import type { Progress } from "../lib/progress.ts";
import type { ImportMode, ImportResult } from "../lib/storage.ts";
import { el } from "./dom.ts";

type Handlers = {
  cases: readonly Case[];
  cardCount: () => number;
  onExport: () => { filename: string; text: string };
  onImport: (text: string, mode: ImportMode) => ImportResult;
  notify: (message: string | null) => void;
  onOpenChange: (open: boolean) => void;
  // The button that opens it, so pressing that is not also a click elsewhere.
  trigger: HTMLElement;
};

const noun = (record: Progress["cards"] | Progress["notes"], word: string) => {
  const n = Object.keys(record).length;
  return `${n} ${word}${n === 1 ? "" : "s"}`;
};

// A small card under the top bar's data icon, on the home screen: hidden until
// opened, closed by a click elsewhere or Escape. It is not a dialog, so nothing
// else is blocked, and the merge or replace choice appears right where the file
// was picked.
export function createDataPanel({ cases, cardCount, onExport, onImport, notify, onOpenChange, trigger }: Handlers) {
  const element = el("section", "data");
  element.hidden = true;

  const input = el("input", "");
  input.type = "file";
  input.accept = ".json,application/json";
  input.hidden = true;

  const exportButton = el("button", "", "Export");
  const importButton = el("button", "", "Import");
  const row = (button: HTMLButtonElement, text: string) => {
    const node = el("div", "data-row");
    node.append(button, el("p", "", text));
    return node;
  };
  const actions = el("div", "data-actions");
  actions.append(
    row(exportButton, "Save your progress and notes to a file."),
    row(importButton, "Load a file you saved before."),
    input,
  );

  const strip = el("div", "import-strip");
  strip.hidden = true;
  const description = el("p", "");
  const merge = el("button", "", "Merge");
  const replace = el("button", "");
  const cancel = el("button", "", "Cancel");
  strip.append(description, merge, replace, cancel);
  element.append(actions, strip);

  let pending: string | null = null;

  function close(): void {
    pending = null;
    strip.hidden = true;
  }

  function apply(mode: ImportMode): void {
    if (pending === null) throw new Error("import applied with no file chosen");
    const result = onImport(pending, mode);
    close();
    if (!result.ok) {
      notify(`Could not import: ${result.error}`);
      return;
    }
    const dropped = result.dropped === 0 ? "" : ` ${result.dropped} unknown case id${result.dropped === 1 ? " was" : "s were"} dropped.`;
    const unsaved = result.saved ? "" : " This browser could not save it; export to keep it.";
    const totals = `${noun(result.progress.cards, "card")}, ${noun(result.progress.notes, "note")}`;
    notify(`${mode === "merge" ? "Merged" : "Replaced"}: ${totals}.${dropped}${unsaved}`);
  }

  exportButton.addEventListener("click", () => {
    const { filename, text } = onExport();
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const link = el("a", "");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  importButton.addEventListener("click", () => input.click());

  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    input.value = "";
    if (file === undefined) return;
    const text = await file.text();
    const parsed = parseProgress(text, cases);
    if (!parsed.ok) {
      close();
      notify(`Could not import: ${parsed.error}`);
      return;
    }
    notify(null);
    pending = text;
    const dropped = parsed.dropped === 0 ? "" : ` · ${parsed.dropped} unknown case id${parsed.dropped === 1 ? "" : "s"} dropped`;
    description.textContent =
      `File saved ${new Date(parsed.updatedAt).toLocaleDateString()} · ` +
      `${noun(parsed.progress.cards, "card")} · ${noun(parsed.progress.notes, "note")}${dropped}`;
    replace.textContent = `Replace (discards ${cardCount()} local card${cardCount() === 1 ? "" : "s"})`;
    strip.hidden = false;
  });

  merge.addEventListener("click", () => apply("merge"));
  replace.addEventListener("click", () => apply("replace"));
  cancel.addEventListener("click", close);

  let opened = false;

  function setOpen(open: boolean): void {
    opened = open;
    element.hidden = !open;
    if (!open) close();
    onOpenChange(open);
  }

  document.addEventListener("pointerdown", (e) => {
    if (e.target instanceof Node && !element.contains(e.target) && !trigger.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });

  return {
    element,
    toggle: () => setOpen(!opened),
    close: () => setOpen(false),
  };
}
