import { describe, expect, it } from "vitest";
import { homeCubies } from "../../lib/physical-cube.ts";
import { faceColorUniforms } from "./face-uniforms.ts";

const cubies = homeCubies();
const withLogo = cubies.filter((cubie) => faceColorUniforms(cubie, null).logo !== null);

describe("the logo on the white center", () => {
  it("belongs to exactly one cubie, the white center", () => {
    expect(withLogo).toHaveLength(1);
    const [center] = withLogo;
    expect(center.faces.filter((f) => f.isSticker).map((f) => f.colors[0])).toEqual(["D"]);
  });

  it("sits on that cubie's sticker face and no other", () => {
    const { logo } = faceColorUniforms(withLogo[0], null);
    expect(logo).not.toBeNull();
    expect(withLogo[0].faces[logo?.face ?? -1].isSticker).toBe(true);
  });

  it("is gone where the mask grays the white center", () => {
    expect(faceColorUniforms(withLogo[0], { kind: "pll-full" }).logo).toBeNull();
  });
});
