import { describe, expect, it } from "vitest";
import { controlerEpaisseurs, limitesEpaisseur } from "./epaisseurs";
import type { ConfigurationChape, Piece } from "./types";

const base: ConfigurationChape = {
  liant: "sulfate_calcium",
  classe: "C20-F4",
  modePose: "desolidarisee",
  support: "beton",
  classeLocal: "P2",
  plancherChauffant: { type: "aucun" },
  revetement: "carrelage",
};

describe("Tableau 8 : sulfate de calcium", () => {
  it.each([
    ["désolidarisée sur béton, P2", { modePose: "desolidarisee", support: "beton", classeLocal: "P2" }, 2.5],
    ["désolidarisée sur béton, P3", { modePose: "desolidarisee", support: "beton", classeLocal: "P3" }, 3],
    ["désolidarisée sur bois, P2", { modePose: "desolidarisee", support: "bois", classeLocal: "P2" }, 2.5],
    ["désolidarisée sur ravoirage, P2", { modePose: "desolidarisee", support: "ravoirage", classeLocal: "P2" }, 4],
    ["désolidarisée sur asphalte, P3", { modePose: "desolidarisee", support: "asphalte", classeLocal: "P3" }, 4],
    ["flottante SC1, P2", { modePose: "flottante", classeIsolant: "SC1", classeLocal: "P2" }, 3.5],
    ["flottante SC1, P3", { modePose: "flottante", classeIsolant: "SC1", classeLocal: "P3" }, 4],
    ["flottante SC2, P2", { modePose: "flottante", classeIsolant: "SC2", classeLocal: "P2" }, 4],
    ["flottante SC2, P3", { modePose: "flottante", classeIsolant: "SC2", classeLocal: "P3" }, 4.5],
  ] as const)("%s → %d cm", (_, patch, attendu) => {
    expect(limitesEpaisseur({ ...base, ...patch }).minCm).toBe(attendu);
  });

  it("limite à 6 cm, 8 cm en enrobage de plancher chauffant", () => {
    expect(limitesEpaisseur(base).maxCm).toBe(6);
    expect(
      limitesEpaisseur({ ...base, plancherChauffant: { type: "eau_A", diametreTubeMm: 16 } }).maxCm,
    ).toBe(8);
  });
});

describe("Tableau 4 : ciment C20-F4", () => {
  const ciment: ConfigurationChape = { ...base, liant: "ciment", classe: "C20-F4" };
  it.each([
    ["adhérente P2", { modePose: "adherente", classeLocal: "P2" }, 3],
    ["adhérente P4", { modePose: "adherente", classeLocal: "P4" }, 5],
    ["adhérente fibrée P4", { modePose: "adherente", classeLocal: "P4", fibree: true }, 4],
    ["désolidarisée P3", { modePose: "desolidarisee", classeLocal: "P3" }, 3],
    ["désolidarisée P4", { modePose: "desolidarisee", classeLocal: "P4" }, 5],
    ["flottante SC1", { modePose: "flottante", classeIsolant: "SC1" }, 4],
    ["flottante SC2", { modePose: "flottante", classeIsolant: "SC2" }, 5],
    ["flottante SC2 fibrée", { modePose: "flottante", classeIsolant: "SC2", fibree: true }, 4.5],
  ] as const)("%s → %d cm", (_, patch, attendu) => {
    expect(limitesEpaisseur({ ...ciment, ...patch }).minCm).toBe(attendu);
  });

  it("limite à 10 cm sous sols souples, pas de maximum sous carrelage", () => {
    expect(limitesEpaisseur({ ...ciment, revetement: "parquet" }).maxCm).toBe(10);
    expect(limitesEpaisseur({ ...ciment, revetement: "carrelage" }).maxCm).toBeNull();
  });
});

describe("Tableau 5 : ciment C16-F3/F4", () => {
  const c16: ConfigurationChape = { ...base, liant: "ciment", classe: "C16-F3" };
  it.each([
    ["adhérente", { modePose: "adherente" }, 3],
    ["désolidarisée", { modePose: "desolidarisee" }, 4],
    ["flottante SC1", { modePose: "flottante", classeIsolant: "SC1" }, 4.5],
    ["flottante SC1 fibrée", { modePose: "flottante", classeIsolant: "SC1", fibree: true }, 4],
    ["flottante SC2", { modePose: "flottante", classeIsolant: "SC2" }, 5],
    ["flottante SC2 fibrée", { modePose: "flottante", classeIsolant: "SC2", fibree: true }, 4.5],
  ] as const)("%s → %d cm", (_, patch, attendu) => {
    expect(limitesEpaisseur({ ...c16, ...patch }).minCm).toBe(attendu);
  });
});

describe("plancher chauffant", () => {
  it("impose 30 mm au-dessus d'un tube de 16 mm : 4,6 cm en tout, au-delà du Tableau 8", () => {
    const l = limitesEpaisseur({
      ...base,
      modePose: "flottante",
      classeIsolant: "SC1",
      plancherChauffant: { type: "eau_A", diametreTubeMm: 16 },
    });
    expect(l.minCm).toBe(4.6);
    expect(l.reference).toBe("RP § 12.2.1.2");
  });

  it("25 mm au-dessus du plot avec un isolant à plots", () => {
    const l = limitesEpaisseur({
      ...base,
      modePose: "flottante",
      classeIsolant: "SC1",
      plancherChauffant: { type: "eau_A", diametreTubeMm: 16, isolantAPlots: true },
    });
    expect(l.minCm).toBe(4.1);
  });

  it("type C : 20 mm au-dessus du tube, le tableau garde la main s'il est plus exigeant", () => {
    const l = limitesEpaisseur({
      ...base,
      modePose: "flottante",
      classeIsolant: "SC2",
      classeLocal: "P3",
      plancherChauffant: { type: "eau_C", diametreTubeMm: 12 },
    });
    // 2 + 1,2 = 3,2 cm < 4,5 cm du Tableau 8 : le tableau l'emporte.
    expect(l.minCm).toBe(4.5);
  });

  it("rayonnant électrique : 40 mm sur SC1, 45 mm sur SC2", () => {
    const sc1 = { ...base, modePose: "flottante" as const, classeIsolant: "SC1" as const, plancherChauffant: { type: "electrique" as const } };
    expect(limitesEpaisseur(sc1).minCm).toBe(4);
    expect(limitesEpaisseur({ ...sc1, classeIsolant: "SC2" }).minCm).toBe(4.5);
  });
});

describe("controlerEpaisseurs", () => {
  const pieces: Piece[] = [
    { id: "1", nom: "Séjour", surfaceM2: 40, perimetreMl: 26, epaisseurCm: 2 },
    { id: "2", nom: "Cuisine", surfaceM2: 12, perimetreMl: 14, epaisseurCm: 4 },
    { id: "3", nom: "Garage", surfaceM2: 20, perimetreMl: 18, epaisseurCm: 7 },
  ];

  it("bloque sous le minimum, avertit au-dessus du maximum, ignore les pièces conformes", () => {
    const alertes = controlerEpaisseurs(pieces, base);
    expect(alertes).toHaveLength(2);
    expect(alertes[0]).toMatchObject({ code: "epaisseur_insuffisante", severite: "bloquant" });
    expect(alertes[0]?.message).toContain("Séjour");
    expect(alertes[1]).toMatchObject({ code: "epaisseur_excessive", severite: "attention" });
    expect(alertes[1]?.message).toContain("Garage");
  });
});
