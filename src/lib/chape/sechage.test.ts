import { describe, expect, it } from "vitest";
import {
  dateSechageEstimee,
  jalonsApresCoulage,
  nombrePrelevementsCM,
  semainesSechageEstimees,
  seuilHumiditeCM,
} from "./sechage";

describe("semainesSechageEstimees", () => {
  it("une semaine par cm jusqu'à 4 cm, puis deux semaines par cm", () => {
    expect(semainesSechageEstimees(3)).toBe(3);
    expect(semainesSechageEstimees(4)).toBe(4);
    expect(semainesSechageEstimees(5)).toBe(6);
    expect(semainesSechageEstimees(6)).toBe(8);
  });
  it("retire une semaine avec une mise en chauffe, sans descendre sous une semaine", () => {
    expect(semainesSechageEstimees(5, true)).toBe(5);
    expect(semainesSechageEstimees(1, true)).toBe(1);
  });
  it("retourne 0 pour une épaisseur nulle", () => {
    expect(semainesSechageEstimees(0)).toBe(0);
  });
});

describe("dateSechageEstimee", () => {
  it("ajoute les semaines à la date de coulage", () => {
    const d = dateSechageEstimee(new Date("2027-03-01T08:00:00Z"), 5);
    expect(d.toISOString()).toBe("2027-04-12T08:00:00.000Z");
  });
});

describe("jalonsApresCoulage", () => {
  const coulage = new Date("2027-03-01T08:00:00Z");

  it("sulfate de calcium : circulation à 24 h, second œuvre à 72 h, contrôle de surface à 4 j, cloisons à 7 j, pas de délai maximal", () => {
    const codes = jalonsApresCoulage(coulage, "sulfate_calcium").map((j) => j.code);
    expect(codes).toEqual(["circulation", "aeration", "charges_fixes", "second_oeuvre", "controle_surface", "cloisons"]);
    const cloisons = jalonsApresCoulage(coulage, "sulfate_calcium").find((j) => j.code === "cloisons");
    expect(cloisons?.date.toISOString()).toBe("2027-03-08T08:00:00.000Z");
  });

  it("ciment : déshumidificateur à 4 j et revêtement au plus tard à 8 semaines", () => {
    const jalons = jalonsApresCoulage(coulage, "ciment");
    expect(jalons.map((j) => j.code)).toContain("deshumidificateur");
    const max = jalons.find((j) => j.code === "revetement_max");
    expect(max?.maximal).toBe(true);
    expect(max?.date.toISOString()).toBe("2027-04-26T08:00:00.000Z");
  });

  it("ajoute la mise en chauffe au délai du produit sur plancher chauffant", () => {
    const jalons = jalonsApresCoulage(coulage, "sulfate_calcium", { plancherChauffant: true, miseEnChauffeJoursMin: 5 });
    const mec = jalons.find((j) => j.code === "mise_en_chauffe");
    expect(mec?.heures).toBe(120);
  });

  it("trie les jalons par délai croissant", () => {
    const heures = jalonsApresCoulage(coulage, "ciment", { plancherChauffant: true }).map((j) => j.heures);
    expect(heures).toEqual([...heures].sort((a, b) => a - b));
  });
});

describe("seuilHumiditeCM (Tableau 13)", () => {
  it("sulfate de calcium : 1 % sous carrelage et pierre, 0,5 % sous les autres revêtements", () => {
    expect(seuilHumiditeCM("sulfate_calcium", "carrelage")).toBe(1);
    expect(seuilHumiditeCM("sulfate_calcium", "pierre")).toBe(1);
    expect(seuilHumiditeCM("sulfate_calcium", "parquet")).toBe(0.5);
    expect(seuilHumiditeCM("sulfate_calcium", "pvc")).toBe(0.5);
    expect(seuilHumiditeCM("sulfate_calcium", "resine")).toBe(0.5);
  });
  it("0,5 % sous un SPEC pleine surface, même pour du carrelage", () => {
    expect(seuilHumiditeCM("sulfate_calcium", "carrelage", { specPleineSurface: true })).toBe(0.5);
  });
  it("ciment : seuil fourni par l'appelant, sinon inconnu", () => {
    expect(seuilHumiditeCM("ciment", "parquet")).toBeNull();
    expect(seuilHumiditeCM("ciment", "parquet", { seuilCiment: 3 })).toBe(3);
  });
});

describe("nombrePrelevementsCM", () => {
  it("2 sous 100 m², puis 1 par tranche de 100 m²", () => {
    expect(nombrePrelevementsCM(45)).toBe(2);
    expect(nombrePrelevementsCM(99)).toBe(2);
    expect(nombrePrelevementsCM(100)).toBe(2);
    expect(nombrePrelevementsCM(150)).toBe(3);
    expect(nombrePrelevementsCM(250)).toBe(4);
    expect(nombrePrelevementsCM(0)).toBe(0);
  });
});
