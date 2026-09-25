export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text = "",
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

// The label span and the key hint are both returned so a caller can change
// either without touching the other.
export function keyedButton(className: string, label: string, key: string, onClick: () => void) {
  const node = el("button", className);
  node.type = "button";
  const text = el("span", "", label);
  const kbd = el("kbd", "", key);
  node.append(text, kbd);
  node.addEventListener("click", onClick);
  return { node, text, kbd };
}

export function toggleButton(label: string, onClick: () => void): HTMLButtonElement {
  const node = el("button", "toggle", label);
  node.type = "button";
  node.addEventListener("click", onClick);
  return node;
}

// A small square button with a tooltip, for a row of tools. `markup` is a
// constant, never user text.
export function squareButton(label: string, markup: string, onClick: () => void): HTMLButtonElement {
  const node = el("button", "step");
  node.innerHTML = markup;
  node.type = "button";
  node.title = label;
  node.setAttribute("aria-label", label);
  node.addEventListener("click", onClick);
  return node;
}
