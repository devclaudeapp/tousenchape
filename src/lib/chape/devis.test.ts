import { describe, expect, it } from "vitest";
import { GRILLE_DEMO, chiffrerDevis, prixMainOeuvreM2 } from "./devis";
import type { ContexteFiscal } from "./tva";
import type { ConfigurationChape, Piece } from "./types";

const config: ConfigurationChape = {
  liant: "sulfate_calcium",
  classe: "C20-F4",
  modePose: "flottante",
  classeIsolant: "SC1",
  classeLocal: "P2",
  plancherChauffant: { type: "eau_A", diametreTubeMm: 16 },
  revetement: "carrelage",
};

const particulier: ContexteFiscal = {
  typeClient: "particulier",
  sousTraitance: false,
  habitation: true,
  logementPlusDe2Ans: true,
  natureTravaux: "amelioration",
  horsEtablissement: true,
};

const maison: Piece[] = [
  { id: "1", nom: "Séjour", surfaceM2: 45, perimetreMl: 27, epaisseurCm: 5.5, longueurMaxM: 9 },
  { id: "2", nom: "Chambre 1", surfaceM2: 12, perimetreMl: 14, epaisseurCm: 5.5, longueurMaxM: 4 },
  { id: "3", nom: "Chambre 2", surfaceM2: 11, perimetreMl: 13.4, epaisseurCm: 5.5, longueurMaxM: 4 },
  { id: "4", nom: "Salle de bains", surfaceM2: 6, perimetreMl: 10, epaisseurCm: 5.5, longueurMaxM: 3 },
];

describe("prixMainOeuvreM2", () => {
  it("prend la tranche de la surface totale", () => {
    expect(prixMainOeuvreM2(40, GRILLE_DEMO)).toBe(14);
    expect(prixMainOeuvreM2(74, GRILLE_DEMO)).toBe(11);
    expect(prixMainOeuvreM2(1000, GRILLE_DEMO)).toBe(8);
  });
});

describe("chiffrerDevis", () => {
  it("chiffre une maison en sulfate de calcium sur plancher chauffant pour un particulier", () => {
    const r = chiffrerDevis({ pieces: maison, config, fiscal: particulier });

    expect(r.quantites.surfaceM2).toBe(74);
    expect(r.quantites.volumeCommandeM3).toBe(4.27);
    expect(r.quantites.nombreToupies).toBe(1);

    const mortier = r.lignes.find((l) => l.designation.startsWith("Mortier"));
    expect(mortier).toMatchObject({ unite: "m³", quantite: 4.27, prixUnitaireHT: 150, montantHT: 640.5 });

    const coulage = r.lignes.find((l) => l.designation.startsWith("Coulage"));
    expect(coulage).toMatchObject({ unite: "m²", quantite: 74, prixUnitaireHT: 11, montantHT: 814 });

    expect(r.lignes.some((l) => l.designation.startsWith("Gestion et évacuation des déchets"))).toBe(true);
    expect(r.lignes.every((l) => l.tauxTVA === 10)).toBe(true);
    expect(r.totaux.totalHT).toBe(Math.round(r.lignes.reduce((s, l) => s + l.montantHT, 0) * 100) / 100);
    expect(r.totaux.tva).toBe(Math.round(r.totaux.totalHT * 0.1 * 100) / 100);
    expect(r.totaux.totalTTC).toBe(Math.round((r.totaux.totalHT + r.totaux.tva) * 100) / 100);
    expect(r.totaux.minimumApplique).toBe(false);
    expect(r.regime.taux).toBe(10);
    // 5,5 cm ≥ 4,6 cm (30 mm au-dessus d'un tube de 16) : aucune alerte d'épaisseur.
    expect(r.alertes.filter((a) => a.code.startsWith("epaisseur"))).toEqual([]);
  });

  it("remonte une alerte bloquante quand une pièce est sous l'épaisseur minimale", () => {
    const r = chiffrerDevis({
      pieces: [{ ...maison[0]!, epaisseurCm: 4 }],
      config,
      fiscal: particulier,
    });
    expect(r.alertes.some((a) => a.code === "epaisseur_insuffisante" && a.severite === "bloquant")).toBe(true);
  });

  it("applique le minimum de facturation sur une petite surface", () => {
    const r = chiffrerDevis({
      pieces: [{ id: "1", nom: "WC", surfaceM2: 2, perimetreMl: 6, epaisseurCm: 5 }],
      config,
      fiscal: particulier,
      options: { film: false, bandePeripherique: false, poncage: false, distanceDepotKm: 10 },
    });
    expect(r.totaux.minimumApplique).toBe(true);
    expect(r.totaux.totalHT).toBe(GRILLE_DEMO.minimumFacturation);
    expect(r.lignes.at(-1)?.designation).toBe("Complément au minimum de facturation");
  });

  it("facture hors taxe en sous-traitance et explique pourquoi le taux réduit ne s'applique pas", () => {
    const r = chiffrerDevis({
      pieces: maison,
      config,
      fiscal: { ...particulier, typeClient: "professionnel", sousTraitance: true, horsEtablissement: false },
    });
    expect(r.regime.autoliquidation).toBe(true);
    expect(r.totaux.tva).toBe(0);
    expect(r.totaux.totalTTC).toBe(r.totaux.totalHT);
    expect(r.alertes.some((a) => a.code === "taux_reduit_sous_traitance")).toBe(true);
  });

  it("facture la pompe par jour, les km au-delà de la franchise et la plus-value de pompage", () => {
    const r = chiffrerDevis({
      pieces: maison,
      config,
      fiscal: particulier,
      options: { joursCoulage: 2, distanceDepotKm: 80, pompageDifficile: true },
    });
    const pompe = r.lignes.find((l) => l.designation.startsWith("Pompe"));
    // 350 + (80 − 30) × 1,8 = 440 par jour, 2 jours
    expect(pompe).toMatchObject({ quantite: 2, prixUnitaireHT: 440, montantHT: 880 });
    expect(r.lignes.some((l) => l.designation.startsWith("Plus-value pompage"))).toBe(true);
  });

  it("signale un fractionnement quand une pièce dépasse les seuils", () => {
    const r = chiffrerDevis({
      pieces: [{ id: "1", nom: "Plateau", surfaceM2: 350, perimetreMl: 80, epaisseurCm: 5.5, longueurMaxM: 28 }],
      config,
      fiscal: particulier,
    });
    const joint = r.alertes.find((a) => a.code === "joints_fractionnement");
    expect(joint?.message).toContain("Plateau");
    expect(joint?.message).toContain("surface");
    expect(joint?.message).toContain("longueur");
  });

  it("ajoute des lignes libres (carrelage) au même taux", () => {
    const r = chiffrerDevis({
      pieces: maison,
      config,
      fiscal: particulier,
      lignesLibres: [{ lot: "carrelage", designation: "Fourniture et pose de carrelage 60 × 60", unite: "m²", quantite: 74, prixUnitaireHT: 45 }],
    });
    const carrelage = r.lignes.find((l) => l.lot === "carrelage");
    expect(carrelage).toMatchObject({ montantHT: 3330, tauxTVA: 10 });
  });
});
