export const AESTHETICS = ["moyu", "gan", "rubiks"] as const;
export type Aesthetic = (typeof AESTHETICS)[number];

export type Profile = {
  label: string;
  // "split": a hidden face takes the color of the nearest sticker face, so a
  // corner's inside is two colors split at a right angle. "black": it is body.
  internals: "split" | "black";
  // Colored only on an inset patch of the flat face, the rest of the piece
  // being body.
  stickered: boolean;
};

export const PROFILES: Record<Aesthetic, Profile> = {
  moyu: { label: "Moyu", internals: "split", stickered: false },
  gan: { label: "GAN", internals: "black", stickered: false },
  rubiks: { label: "Rubik's", internals: "black", stickered: true },
};

// How far in from a piece's outline a sticker's own outline runs.
export const STICKER_INSET = 0.06;

// A sticker's corner is never sharper than this, even on a square outer corner.
export const STICKER_MIN_RADIUS = 0.03;

// The logo's half-width on the white center, in the same units.
export const LOGO_HALF = 0.32;
