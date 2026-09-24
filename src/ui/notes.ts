import { el } from "./dom.ts";

// A note stays out of the way until wanted: its text when there is one and
// notes are shown, a textarea only while editing it in place. Editing starts
// from the top bar's button. Clicking the text opens it to its full length.
export function createNotes(onNote: (text: string) => void) {
  const element = el("div", "notes-side");
  const text = el("p", "note-text");
  const area = el("textarea", "note");
  area.setAttribute("aria-label", "Notes for this case");

  let editing = false;
  let visible = true;
  let expanded = false;

  function grow(): void {
    area.style.height = "auto";
    area.style.height = `${area.scrollHeight}px`;
  }

  function sync(): void {
    const has = area.value !== "";
    area.hidden = !editing;
    text.hidden = editing || !has || !visible;
    text.textContent = area.value;
    text.classList.toggle("open", expanded);
    element.hidden = area.hidden && text.hidden;
    element.classList.toggle("editing", editing);
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
  text.addEventListener("click", () => {
    expanded = !expanded;
    sync();
  });
  element.append(text, area);

  return {
    element,
    edit,
    // Equal while typing, so the caret is not disturbed; different after an
    // import replaced the note underneath, or on another card. Hiding notes
    // never hides the textarea, so a note can still be written.
    show(note: string, shown: boolean): void {
      if (area.value !== note) area.value = note;
      visible = shown;
      sync();
    },
    // Another card: whatever was being edited is done, and the next note
    // starts collapsed.
    stop(): void {
      expanded = false;
      area.blur();
    },
  };
}
