// A stored or imported blob is untrusted text, so its readers share one way to
// say "this is not ours": Invalid, which parseProgress turns into a result.
export class Invalid extends Error {}

export function reject(message: string): never {
  throw new Invalid(message);
}

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
