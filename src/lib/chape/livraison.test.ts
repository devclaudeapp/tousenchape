import { describe, expect, it } from "vitest";
import { controlerLivraison, temperatureAdmissible } from "./livraison";
import type { ProduitChape } from "./types";

const classic: ProduitChape = {
  id: "classic",
  nom: "La Chape Liquide Classic",
  fabricant: "Anhydritec",
  liant: "sulfate_calcium",
  classe: "C20-F4",
  etalementMinCm: 24,
  etalementMaxCm: 28,
  eauMaxLParM3: 50,
  tempsUtilisationMin: 180,
  masseVolumiqueKgM3: 2000,
  miseEnChauffeJoursMin: 7,
  certificatQB46: "QB46-001",
};

const codes = (a: { code: string }[]) => a.map((x) => x.code);

describe("controlerLivraison", () => {
  it("accepte une toupie dans la plage, sans eau, livrée à temps", () => {
    const alertes = controlerLivraison(
      {
        etalementDepartCm: 26,
        etalementChantierCm: 25,
        eauAjouteeLParM3: 0,
        heureFabrication: new Date("2027-03-01T07:00:00Z"),
        heureArrivee: new Date("2027-03-01T08:00:00Z"),
      },
      classic,
    );
    expect(alertes).toEqual([]);
  });

  it("bloque sous 22 cm : ce n'est plus un mortier fluide", () => {
    const alertes = controlerLivraison({ etalementChantierCm: 21, eauAjouteeLParM3: 0 }, classic);
    expect(codes(alertes)).toEqual(["etalement_non_fluide"]);
    expect(alertes[0]?.severite).toBe("bloquant");
  });

  it("avertit hors de la plage du produit", () => {
    expect(codes(controlerLivraison({ etalementChantierCm: 23, eauAjouteeLParM3: 0 }, classic))).toEqual(["etalement_hors_plage"]);
    expect(codes(controlerLivraison({ etalementChantierCm: 29, eauAjouteeLParM3: 0 }, classic))).toEqual(["etalement_hors_plage"]);
  });

  it("bloque une perte d'étalement de plus de 20 % entre la centrale et le chantier", () => {
    const alertes = controlerLivraison({ etalementDepartCm: 28, etalementChantierCm: 22, eauAjouteeLParM3: 0 }, classic);
    // 22 est dans [22, 24[ → hors plage ; perte 21 % → bloquant
    expect(codes(alertes)).toEqual(["etalement_hors_plage", "perte_etalement"]);
  });

  it("tolère une perte de 20 % exactement", () => {
    const alertes = controlerLivraison({ etalementDepartCm: 30, etalementChantierCm: 24, eauAjouteeLParM3: 0 }, classic);
    expect(codes(alertes)).not.toContain("perte_etalement");
  });

  it("bloque un ajout d'eau au-delà du certificat", () => {
    expect(codes(controlerLivraison({ etalementChantierCm: 25, eauAjouteeLParM3: 60 }, classic))).toEqual(["eau_excessive"]);
    expect(codes(controlerLivraison({ etalementChantierCm: 25, eauAjouteeLParM3: 50 }, classic))).toEqual([]);
  });

  it("bloque au-delà du temps d'utilisation et avertit à moins de 30 min de la fin", () => {
    const fab = new Date("2027-03-01T07:00:00Z");
    const tard = controlerLivraison(
      { etalementChantierCm: 25, eauAjouteeLParM3: 0, heureFabrication: fab, heureArrivee: new Date("2027-03-01T10:15:00Z") },
      classic,
    );
    expect(codes(tard)).toEqual(["temps_utilisation_depasse"]);

    const juste = controlerLivraison(
      { etalementChantierCm: 25, eauAjouteeLParM3: 0, heureFabrication: fab, heureFinDechargement: new Date("2027-03-01T09:40:00Z") },
      classic,
    );
    expect(codes(juste)).toEqual(["temps_utilisation_proche"]);
  });
});

describe("temperatureAdmissible", () => {
  it("de +5 °C à +30 °C", () => {
    expect(temperatureAdmissible(5)).toBe(true);
    expect(temperatureAdmissible(30)).toBe(true);
    expect(temperatureAdmissible(4)).toBe(false);
    expect(temperatureAdmissible(31)).toBe(false);
  });
});
