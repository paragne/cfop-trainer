// Open and close behavior shared by the panels under the top bar: closed by a
// click elsewhere or Escape. Not dialogs, so nothing else on the page is
// blocked while one is open.
export function dismissable(
  element: HTMLElement,
  // The button that opens it, so pressing that is not also a click elsewhere.
  trigger: HTMLElement,
  onOpenChange: (open: boolean) => void,
) {
  let opened = false;

  function setOpen(open: boolean): void {
    opened = open;
    element.hidden = !open;
    onOpenChange(open);
  }

  document.addEventListener("pointerdown", (e) => {
    if (opened && e.target instanceof Node && !element.contains(e.target) && !trigger.contains(e.target)) setOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (opened && e.key === "Escape") setOpen(false);
  });

  return { toggle: () => setOpen(!opened), close: () => setOpen(false) };
}
