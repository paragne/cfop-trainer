import { el, squareButton } from "./dom.ts";
import { PENCIL_ICON } from "./icons.ts";

// A note stays out of the way until wanted: a pencil when there is none, the
// note's text when there is one, and a textarea only while editing it in place.
export function createNotes(onNote: (text: string) => void) {
  const text = el("p", "note-text");
  text.hidden = true;
  const area = el("textarea", "note");
  area.setAttribute("aria-label", "Notes for this case");
  area.hidden = true;

  let editing = false;
  const button = squareButton("Add note", PENCIL_ICON, () => edit());

  function grow(): void {
    area.style.height = "auto";
    area.style.height = `${area.scrollHeight}px`;
  }

  function sync(): void {
    const has = area.value !== "";
    area.hidden = !editing;
    text.hidden = editing || !has;
    text.textContent = area.value;
    const label = has ? "Edit note" : "Add note";
    button.title = label;
    button.setAttribute("aria-label", label);
  }

  function edit(): void {
    editing = true;
    sync();
    area.focus();
    grow();
  }

  area.addEventListener("input", () => {
    onNote(area.value);
    grow();
  });
  area.addEventListener("keydown", (e) => {
    if (e.key === "Escape") area.blur();
  });
  area.addEventListener("blur", () => {
    editing = false;
    sync();
  });
  text.addEventListener("click", edit);

  return {
    button,
    // The note itself, under the card's other text.
    body: [text, area],
    // Equal while typing, so the caret is not disturbed; different after an
    // import replaced the note underneath, or on another card.
    show(note: string): void {
      if (area.value !== note) area.value = note;
      sync();
    },
    // Another card: whatever was being edited is done.
    stop(): void {
      area.blur();
    },
  };
}
