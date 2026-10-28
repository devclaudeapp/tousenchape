import { describe, expect, it } from "vitest";
import { evaluerJoints, nombreZonesFractionnement, seuilsJoints } from "./joints";
import type { ConfigurationChape } from "./types";

const base: ConfigurationChape = {
  liant: "ciment",
  classe: "C20-F4",
  modePose: "desolidarisee",
  support: "beton",
  classeLocal: "P2",
  plancherChauffant: { type: "aucun" },
  revetement: "carrelage",
};

describe("seuilsJoints", () => {
  it("ciment, cas général : 60 m² et 10 m", () => {
    expect(seuilsJoints(base)).toMatchObject({ surfaceMaxM2: 60, longueurMaxM: 10 });
  });
  it("ciment, retrait engagé ≤ 400 µm/m : 100 m² et 14 m", () => {
    expect(seuilsJoints({ ...base, retraitEngageUmParM: 400 })).toMatchObject({ surfaceMaxM2: 100, longueurMaxM: 14 });
  });
  it("ciment, retrait engagé ≤ 600 µm/m : 80 m² et 14 m", () => {
    expect(seuilsJoints({ ...base, retraitEngageUmParM: 550 })).toMatchObject({ surfaceMaxM2: 80, longueurMaxM: 14 });
  });
  it("ciment, retrait engagé supérieur à 600 : cas général", () => {
    expect(seuilsJoints({ ...base, retraitEngageUmParM: 800 })).toMatchObject({ surfaceMaxM2: 60 });
  });
  it("ciment sur plancher chauffant : 40 m² et 8 m, même avec un faible retrait", () => {
    expect(
      seuilsJoints({ ...base, retraitEngageUmParM: 400, plancherChauffant: { type: "eau_A", diametreTubeMm: 16 } }),
    ).toMatchObject({ surfaceMaxM2: 40, longueurMaxM: 8 });
  });
  it("sulfate de calcium : 1 000 m² et 45 m ; 300 m² et 25 m sur plancher chauffant", () => {
    expect(seuilsJoints({ ...base, liant: "sulfate_calcium" })).toMatchObject({ surfaceMaxM2: 1000, longueurMaxM: 45 });
    expect(
      seuilsJoints({ ...base, liant: "sulfate_calcium", plancherChauffant: { type: "electrique" } }),
    ).toMatchObject({ surfaceMaxM2: 300, longueurMaxM: 25 });
  });
});

describe("evaluerJoints", () => {
  it("signale la surface et la longueur dépassées, séparément", () => {
    const [grand, long, ok] = evaluerJoints(
      [
        { id: "1", nom: "Plateau", surfaceM2: 90, perimetreMl: 40, epaisseurCm: 5, longueurMaxM: 9 },
        { id: "2", nom: "Couloir", surfaceM2: 18, perimetreMl: 27, epaisseurCm: 5, longueurMaxM: 12 },
        { id: "3", nom: "Chambre", surfaceM2: 12, perimetreMl: 14, epaisseurCm: 5, longueurMaxM: 4 },
      ],
      base,
    );
    expect(grand?.necessaire).toBe(true);
    expect(grand?.motifs).toHaveLength(1);
    expect(grand?.motifs[0]).toContain("surface");
    expect(long?.necessaire).toBe(true);
    expect(long?.motifs[0]).toContain("longueur");
    expect(ok?.necessaire).toBe(false);
  });
});

describe("nombreZonesFractionnement", () => {
  it("compte les zones par surface et par longueur, et garde la plus exigeante", () => {
    const piece = { id: "1", nom: "Plateau", surfaceM2: 150, perimetreMl: 50, epaisseurCm: 5, longueurMaxM: 32 };
    // 150 / 60 → 3 zones ; 32 / 10 → 4 zones
    expect(nombreZonesFractionnement(piece, base)).toBe(4);
    expect(nombreZonesFractionnement(piece, { ...base, liant: "sulfate_calcium" })).toBe(1);
  });
});
