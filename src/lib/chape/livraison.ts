import type { Alerte, ProduitChape } from "./types";

/**
 * Contrôle d'une toupie à la livraison (RP § 10.4.1 et 11.4.1, certificat QB46 du produit).
 */

export interface Livraison {
  /** Étalement mesuré au départ de la centrale, en cm (bon de livraison). */
  etalementDepartCm?: number;
  /** Étalement mesuré sur chantier avant déchargement, en cm. */
  etalementChantierCm: number;
  /** Eau ajoutée sur chantier, en l/m³. */
  eauAjouteeLParM3: number;
  heureFabrication?: Date;
  heureArrivee?: Date;
  /** Fin prévue du déchargement, pour le temps d'utilisation. */
  heureFinDechargement?: Date;
}

/** Étalement minimal pour porter l'appellation « mortier fluide » (NF EN 13454-1, RP § 5.1). */
export const ETALEMENT_MIN_FLUIDE_CM = 22;
/** Perte d'étalement au-delà de laquelle l'ajout d'eau n'est plus admis (RP § 10.4.1 / 11.4.1). */
export const PERTE_ETALEMENT_MAX = 0.2;

export function controlerLivraison(livraison: Livraison, produit: ProduitChape): Alerte[] {
  const alertes: Alerte[] = [];
  const e = livraison.etalementChantierCm;

  if (e < ETALEMENT_MIN_FLUIDE_CM) {
    alertes.push({
      code: "etalement_non_fluide",
      severite: "bloquant",
      message: `Étalement de ${e} cm : sous les 22 cm d'un mortier fluide.`,
      reference: "NF EN 13454-1, RP § 5.1",
    });
  } else if (e < produit.etalementMinCm || e > produit.etalementMaxCm) {
    alertes.push({
      code: "etalement_hors_plage",
      severite: "attention",
      message: `Étalement de ${e} cm hors de la plage ${produit.etalementMinCm} à ${produit.etalementMaxCm} cm du produit ${produit.nom}.`,
      reference: `Certificat QB46 ${produit.certificatQB46 ?? ""}`.trim(),
    });
  }

  if (livraison.etalementDepartCm !== undefined && livraison.etalementDepartCm > 0) {
    const perte = (livraison.etalementDepartCm - e) / livraison.etalementDepartCm;
    if (perte > PERTE_ETALEMENT_MAX) {
      alertes.push({
        code: "perte_etalement",
        severite: "bloquant",
        message: `Perte d'étalement de ${Math.round(perte * 100)} % entre la centrale et le chantier : ajout d'eau interdit, toupie à refuser ou à signaler.`,
        reference: "RP § 10.4.1 / 11.4.1",
      });
    }
  }

  if (livraison.eauAjouteeLParM3 > produit.eauMaxLParM3) {
    alertes.push({
      code: "eau_excessive",
      severite: "bloquant",
      message: `${livraison.eauAjouteeLParM3} l/m³ d'eau ajoutée : maximum ${produit.eauMaxLParM3} l/m³ pour ${produit.nom}.`,
      reference: `Certificat QB46 ${produit.certificatQB46 ?? ""}`.trim(),
    });
  }

  const fin = livraison.heureFinDechargement ?? livraison.heureArrivee;
  if (livraison.heureFabrication && fin) {
    const minutes = (fin.getTime() - livraison.heureFabrication.getTime()) / 60000;
    if (minutes > produit.tempsUtilisationMin) {
      alertes.push({
        code: "temps_utilisation_depasse",
        severite: "bloquant",
        message: `${Math.round(minutes)} min depuis la fabrication : temps d'utilisation de ${produit.tempsUtilisationMin} min dépassé.`,
        reference: "DTA / certificat QB46 du produit",
      });
    } else if (minutes > produit.tempsUtilisationMin - 30) {
      alertes.push({
        code: "temps_utilisation_proche",
        severite: "attention",
        message: `${Math.round(minutes)} min depuis la fabrication : moins de 30 min de marge avant la fin du temps d'utilisation.`,
      });
    }
  }

  return alertes;
}

/** Température admissible du support et de l'air pendant le coulage : de +5 °C à +30 °C (RP § 10.1 / 11.1). */
export function temperatureAdmissible(temperatureC: number): boolean {
  return temperatureC >= 5 && temperatureC <= 30;
}
