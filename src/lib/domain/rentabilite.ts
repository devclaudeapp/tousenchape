import type { ResultatDevis } from "@/lib/chape/devis";
import type { Chantier, Facture, LivraisonBon, Membre, Produit } from "@/lib/domain/types";
import { dureeHeures, type PointageCalculable } from "./heures";

/**
 * Rentabilité réelle d'un chantier : ce qui a été facturé contre ce qu'il a coûté.
 * Les coûts viennent des données saisies (livraisons, pointages, grille), pas d'estimations.
 */

export interface CoutsChantier {
  /** Mortier réellement livré (volume des bons × prix du produit), en € HT. */
  mortier: number;
  /** Heures pointées × coût horaire chargé de chaque compagnon, en €. */
  mainOeuvre: number;
  heures: number;
  /** Pompe et déplacement pris au devis (forfait par jour), en € HT. */
  pompe: number;
  total: number;
}

export interface RentabiliteChantier {
  chantierId: string;
  /** Devis signé, en € HT. */
  prevuHT: number;
  /** Factures émises (hors avoirs et annulées), en € HT. */
  factureHT: number;
  couts: CoutsChantier;
  margeEuros: number;
  /** Marge sur le facturé (ou sur le prévu si rien n'est facturé), en %. */
  margePct: number | null;
  /** Volume livré contre volume théorique du devis : pertes réelles en %. */
  volumeLivreM3: number;
  volumeTheoriqueM3: number;
  pertesReellesPct: number | null;
  /** Surface coulée par heure pointée. */
  m2ParHeure: number | null;
  complet: boolean;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

export function rentabiliteChantier(input: {
  chantier: Chantier;
  resultatDevis: ResultatDevis | null;
  factures: Facture[];
  livraisons: LivraisonBon[];
  pointages: PointageCalculable[];
  membres: Membre[];
  produit: Produit | null;
  forfaitPompeJour: number;
  coutHoraireDefaut: number;
}): RentabiliteChantier {
  const { chantier, resultatDevis, factures, livraisons, pointages, membres, produit, forfaitPompeJour, coutHoraireDefaut } = input;

  const prevuHT = resultatDevis?.totaux.totalHT ?? 0;
  const factureHT = r2(factures.filter((f) => f.chantierId === chantier.id && f.statut !== "annulee" && f.type !== "avoir").reduce((s, f) => s + f.totalHT, 0));

  const volumeLivre = r2(livraisons.reduce((s, l) => s + l.volumeM3, 0));
  const prixM3 = produit?.prixM3 ?? 0;
  const mortier = r2(volumeLivre * prixM3);

  let heures = 0;
  let mainOeuvre = 0;
  for (const p of pointages.filter((x) => x.statut !== "refuse")) {
    const h = dureeHeures(p);
    const m = membres.find((x) => x.id === p.membreId);
    heures += h;
    mainOeuvre += h * (m?.coutHoraire ?? coutHoraireDefaut);
  }
  heures = r2(heures);
  mainOeuvre = r2(mainOeuvre);

  const joursCoulage = resultatDevis ? Math.max(1, resultatDevis.lignes.find((l) => l.designation.startsWith("Pompe"))?.quantite ?? 1) : 1;
  const pompe = r2(forfaitPompeJour * joursCoulage);

  const total = r2(mortier + mainOeuvre + pompe);
  const base = factureHT > 0 ? factureHT : prevuHT;
  const margeEuros = r2(base - total);
  const volumeTheorique = resultatDevis?.quantites.volumeTheoriqueM3 ?? 0;

  return {
    chantierId: chantier.id,
    prevuHT: r2(prevuHT),
    factureHT,
    couts: { mortier, mainOeuvre, heures, pompe, total },
    margeEuros,
    margePct: base > 0 ? Math.round((margeEuros / base) * 1000) / 10 : null,
    volumeLivreM3: volumeLivre,
    volumeTheoriqueM3: r2(volumeTheorique),
    pertesReellesPct: volumeTheorique > 0 && volumeLivre > 0 ? Math.round(((volumeLivre - volumeTheorique) / volumeTheorique) * 1000) / 10 : null,
    m2ParHeure: heures > 0 && chantier.surfaceCouleeM2 ? Math.round((chantier.surfaceCouleeM2 / heures) * 10) / 10 : null,
    complet: factureHT > 0 && livraisons.length > 0 && heures > 0,
  };
}

export interface RentabiliteEquipe {
  equipeId: string;
  chantiers: number;
  m2: number;
  heures: number;
  m2ParJour: number | null;
  heuresParM2: number | null;
  margeEuros: number;
}

/** Agrégat par équipe des chantiers coulés : m² par jour de coulage, heures par m², marge cumulée. */
export function rentabiliteParEquipe(chantiers: Chantier[], rentabilites: RentabiliteChantier[]): RentabiliteEquipe[] {
  const parEquipe = new Map<string, RentabiliteEquipe & { jours: Set<string> }>();
  for (const c of chantiers) {
    if (!c.equipeId || !c.surfaceCouleeM2) continue;
    const r = rentabilites.find((x) => x.chantierId === c.id);
    if (!r) continue;
    const e = parEquipe.get(c.equipeId) ?? { equipeId: c.equipeId, chantiers: 0, m2: 0, heures: 0, m2ParJour: null, heuresParM2: null, margeEuros: 0, jours: new Set<string>() };
    e.chantiers += 1;
    e.m2 += c.surfaceCouleeM2;
    e.heures += r.couts.heures;
    e.margeEuros += r.margeEuros;
    if (c.dateCoulage) e.jours.add(c.dateCoulage);
    parEquipe.set(c.equipeId, e);
  }
  return [...parEquipe.values()].map(({ jours, ...e }) => ({
    ...e,
    m2: r2(e.m2),
    heures: r2(e.heures),
    margeEuros: r2(e.margeEuros),
    m2ParJour: jours.size > 0 ? Math.round(e.m2 / jours.size) : null,
    heuresParM2: e.m2 > 0 && e.heures > 0 ? Math.round((e.heures / e.m2) * 1000) / 1000 : null,
  }));
}
