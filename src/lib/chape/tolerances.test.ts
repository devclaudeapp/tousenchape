import { describe, expect, it } from "vitest";
import { fissureAReparer, niveauConforme, planeiteConforme, toleranceNiveauMm } from "./tolerances";

describe("planéité", () => {
  it("3 mm sous 2 m, 1 mm sous 20 cm", () => {
    expect(planeiteConforme(3, "2m")).toBe(true);
    expect(planeiteConforme(3.5, "2m")).toBe(false);
    expect(planeiteConforme(1, "20cm")).toBe(true);
    expect(planeiteConforme(1.5, "20cm")).toBe(false);
  });
});

describe("niveau", () => {
  it("± (5 + 1 × d) mm", () => {
    expect(toleranceNiveauMm(0)).toBe(5);
    expect(toleranceNiveauMm(3)).toBe(8);
    expect(toleranceNiveauMm(10)).toBe(15);
    expect(niveauConforme(-8, 3)).toBe(true);
    expect(niveauConforme(9, 3)).toBe(false);
  });
});

describe("fissures", () => {
  it("à réparer au-delà de 0,3 mm", () => {
    expect(fissureAReparer(0.3)).toBe(false);
    expect(fissureAReparer(0.4)).toBe(true);
  });
});
