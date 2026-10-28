import { describe, expect, it } from "vitest";
import { chiffrerDevis } from "@/lib/chape/devis";
import type { Chantier, Facture, LivraisonBon, Membre, Produit } from "./types";
import type { PointageCalculable } from "./heures";
import { rentabiliteChantier, rentabiliteParEquipe } from "./rentabilite";

const produit: Produit = { id: "p", entrepriseId: null, nom: "Classic", fabricant: "Anhydritec", liant: "sulfate_calcium", classe: "C20-F4", etalementMinCm: 24, etalementMaxCm: 28, eauMaxLParM3: 50, tempsUtilisationMin: 180, masseVolumiqueKgM3: 2000, miseEnChauffeJoursMin: 7, prixM3: 120 };
const chantier: Chantier = { id: "c", entrepriseId: "e", clientId: "cl", numero: "CH-1", statut: "facture", adresse: "", codePostal: "", ville: "", equipeId: "eq", dateCoulage: "2027-03-01", surfaceCouleeM2: 100, createdAt: "", updatedAt: "" };
const membres: Membre[] = [
  { id: "chef", entrepriseId: "e", nom: "Chef", email: "", role: "chef_equipe", habilitations: [], actif: true, coutHoraire: 32 },
  { id: "app", entrepriseId: "e", nom: "App", email: "", role: "applicateur", habilitations: [], actif: true },
];
const pointage = (membreId: string, h: number): PointageCalculable => ({ membreId, date: "2027-03-01", debut: "2027-03-01T07:00:00", fin: `2027-03-01T${String(7 + h).padStart(2, "0")}:00:00`, pauseMin: 0, type: "chantier", panier: true, grandDeplacement: false, statut: "valide_bureau" });

// 100 m² à 5 cm : 5 m³ théoriques, 5,25 m³ avec pertes.
const resultat = chiffrerDevis({
  pieces: [{ id: "1", nom: "A", surfaceM2: 100, perimetreMl: 40, epaisseurCm: 5 }],
  config: { liant: "sulfate_calcium", classe: "C20-F4", modePose: "desolidarisee", support: "beton", classeLocal: "P2", plancherChauffant: { type: "aucun" }, revetement: "carrelage" },
  fiscal: { typeClient: "professionnel", sousTraitance: true, habitation: true, logementPlusDe2Ans: false, natureTravaux: "neuf", horsEtablissement: false },
  grille: undefined,
});
const facture: Facture = { id: "f", entrepriseId: "e", clientId: "cl", chantierId: "c", numero: "FA-1", type: "solde", statut: "emise", dateEmission: "2027-03-10", dateEcheance: "2027-04-10", lignes: [], totalHT: 3000, tva: 0, totalTTC: 3000, retenueGarantie: 0, autoliquidation: true, mentions: [], paiements: [], createdAt: "" };
const livraisons: LivraisonBon[] = [
  { id: "l1", chantierId: "c", numeroBon: "1", volumeM3: 5.5, etalementChantierCm: 25, eauAjouteeLParM3: 0, alertes: [], createdAt: "" },
];

describe("rentabiliteChantier", () => {
  it("calcule coûts réels, marge, pertes et m²/h", () => {
    const r = rentabiliteChantier({ chantier, resultatDevis: resultat, factures: [facture], livraisons, pointages: [pointage("chef", 8), pointage("app", 8)], membres, produit, forfaitPompeJour: 350, coutHoraireDefaut: 26 });
    expect(r.factureHT).toBe(3000);
    expect(r.couts.mortier).toBe(660); // 5,5 × 120
    expect(r.couts.heures).toBe(16);
    expect(r.couts.mainOeuvre).toBe(8 * 32 + 8 * 26); // 464
    expect(r.couts.pompe).toBe(350);
    expect(r.couts.total).toBe(1474);
    expect(r.margeEuros).toBe(1526);
    expect(r.margePct).toBe(50.9);
    expect(r.volumeTheoriqueM3).toBe(5);
    expect(r.pertesReellesPct).toBe(10); // 5,5 contre 5
    expect(r.m2ParHeure).toBe(6.3);
    expect(r.complet).toBe(true);
  });

  it("se rabat sur le devis quand rien n'est facturé et signale un dossier incomplet", () => {
    const r = rentabiliteChantier({ chantier, resultatDevis: resultat, factures: [], livraisons: [], pointages: [], membres, produit, forfaitPompeJour: 350, coutHoraireDefaut: 26 });
    expect(r.factureHT).toBe(0);
    expect(r.prevuHT).toBe(resultat.totaux.totalHT);
    expect(r.margeEuros).toBe(Math.round((resultat.totaux.totalHT - 350) * 100) / 100);
    expect(r.pertesReellesPct).toBeNull();
    expect(r.complet).toBe(false);
  });

  it("exclut les pointages refusés", () => {
    const r = rentabiliteChantier({ chantier, resultatDevis: null, factures: [], livraisons: [], pointages: [{ ...pointage("app", 8), statut: "refuse" }], membres, produit, forfaitPompeJour: 0, coutHoraireDefaut: 26 });
    expect(r.couts.heures).toBe(0);
  });
});

describe("rentabiliteParEquipe", () => {
  it("agrège m² par jour, heures par m² et marge", () => {
    const r1 = rentabiliteChantier({ chantier, resultatDevis: resultat, factures: [facture], livraisons, pointages: [pointage("chef", 8), pointage("app", 8)], membres, produit, forfaitPompeJour: 350, coutHoraireDefaut: 26 });
    const c2 = { ...chantier, id: "c2", dateCoulage: "2027-03-02", surfaceCouleeM2: 200 };
    const r2 = rentabiliteChantier({ chantier: c2, resultatDevis: null, factures: [{ ...facture, id: "f2", chantierId: "c2", totalHT: 5000 }], livraisons: [], pointages: [{ ...pointage("chef", 10), date: "2027-03-02" }], membres, produit, forfaitPompeJour: 350, coutHoraireDefaut: 26 });
    const [eq] = rentabiliteParEquipe([chantier, c2], [r1, r2]);
    expect(eq).toMatchObject({ equipeId: "eq", chantiers: 2, m2: 300, heures: 26, m2ParJour: 150 });
    expect(eq?.heuresParM2).toBe(0.087);
    expect(eq?.margeEuros).toBe(Math.round((r1.margeEuros + r2.margeEuros) * 100) / 100);
  });
});
