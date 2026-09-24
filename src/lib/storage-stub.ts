import { vi } from "vitest";

// Tests my logic against a Map. It cannot say how a real browser behaves at
// quota or in private mode.
export function stubStorage(seed: Record<string, string> = {}, failWrites = false) {
  const data = new Map(Object.entries(seed));
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      if (failWrites) throw new DOMException("full", "QuotaExceededError");
      data.set(k, v);
    },
    removeItem: (k: string) => {
      if (failWrites) throw new DOMException("denied", "SecurityError");
      data.delete(k);
    },
  });
  return data;
}
