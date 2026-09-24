import { createGlContext } from "./gl-context.ts";

let available: boolean | undefined;

// The one probe creates a real context, so it gives that context straight
// back: browsing cards must not hold a GPU context, and a browser caps how
// many live ones a page may own.
export function webgl2Available(): boolean {
  if (available === undefined) {
    const probe = createGlContext(document.createElement("canvas"));
    available = probe !== null;
    probe?.release();
  }
  return available;
}
