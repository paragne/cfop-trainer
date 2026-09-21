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

// The label span is returned so a caller can change the text without touching
// the key hint.
export function keyedButton(className: string, label: string, key: string, onClick: () => void) {
  const node = el("button", className);
  node.type = "button";
  const text = el("span", "", label);
  node.append(text, el("kbd", "", key));
  node.addEventListener("click", onClick);
  return { node, text };
}

export function toggleButton(label: string, onClick: () => void): HTMLButtonElement {
  const node = el("button", "toggle", label);
  node.type = "button";
  node.addEventListener("click", onClick);
  return node;
}
