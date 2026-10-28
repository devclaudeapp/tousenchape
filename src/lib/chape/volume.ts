import type { Piece } from "./types";

/**
 * Quantités : volume de mortier, toupies, film, bande périphérique, charge sur plancher.
 */

export interface ParametresQuantites {
  /** Taux de pertes appliqué au volume théorique (0,05 = 5 %). */
  tauxPertes: number;
  /** Capacité utile d'un camion toupie, en m³. */
  capaciteToupieM3: number;
  /** Recouvrement entre lés de film, en fraction de surface (0,10 = 10 %, RP § 10.3.5 et 11.3.5). */
  recouvrementFilm: number;
  /** Remontée du film au-dessus du niveau fini, en m (RP : 10 cm minimum). */
  remonteeFilmM: number;
  /** Périmètre moyen d'un poteau ou fourreau, en m. */
  perimetrePoteauM: number;
}

export const PARAMETRES_QUANTITES_DEFAUT: ParametresQuantites = {
  tauxPertes: 0.05,
  capaciteToupieM3: 7,
  recouvrementFilm: 0.1,
  remonteeFilmM: 0.1,
  perimetrePoteauM: 1.2,
};

export interface Quantites {
  surfaceM2: number;
  /** Volume théorique, sans pertes, en m³. */
  volumeTheoriqueM3: number;
  /** Volume à commander, pertes comprises, en m³. */
  volumeCommandeM3: number;
  nombreToupies: number;
  /** Volume restant dans la dernière toupie, en m³ (0 si elle est pleine). */
  resteDerniereToupieM3: number;
  /** Épaisseur moyenne pondérée par la surface, en cm. */
  epaisseurMoyenneCm: number;
  filmM2: number;
  bandePeripheriqueMl: number;
}

const arrondi = (x: number, decimales = 2) => Math.round(x * 10 ** decimales) / 10 ** decimales;

export function calculerQuantites(
  pieces: Piece[],
  params: Partial<ParametresQuantites> = {},
): Quantites {
  const p = { ...PARAMETRES_QUANTITES_DEFAUT, ...params };
  if (p.capaciteToupieM3 <= 0) throw new Error("La capacité d'une toupie doit être positive.");

  let surface = 0;
  let volume = 0;
  let film = 0;
  let bande = 0;
  for (const piece of pieces) {
    surface += piece.surfaceM2;
    const epaisseurM = piece.epaisseurCm / 100;
    volume += piece.surfaceM2 * epaisseurM;
    // Film : surface avec recouvrement entre lés + remontée périphérique (épaisseur de chape + 10 cm).
    film += piece.surfaceM2 * (1 + p.recouvrementFilm) + piece.perimetreMl * (epaisseurM + p.remonteeFilmM);
    bande += piece.perimetreMl + (piece.poteaux ?? 0) * p.perimetrePoteauM;
  }

  // Le volume commandé est arrondi au litre près avant de compter les toupies :
  // les chiffres affichés (volume, toupies, reste) se recoupent ainsi exactement.
  const volumeCommande = arrondi(volume * (1 + p.tauxPertes), 2);
  const nombreToupies = volumeCommande > 0 ? Math.ceil(volumeCommande / p.capaciteToupieM3 - 1e-9) : 0;
  const reste = nombreToupies > 0 ? nombreToupies * p.capaciteToupieM3 - volumeCommande : 0;

  return {
    surfaceM2: arrondi(surface),
    volumeTheoriqueM3: arrondi(volume, 3),
    volumeCommandeM3: volumeCommande,
    nombreToupies,
    resteDerniereToupieM3: arrondi(reste, 2),
    epaisseurMoyenneCm: surface > 0 ? arrondi((volume / surface) * 100, 1) : 0,
    filmM2: arrondi(film, 1),
    bandePeripheriqueMl: arrondi(bande, 1),
  };
}

/** Charge apportée par la chape, en kg/m², à partir de la masse volumique durcie (≈ 20 kg/m² par cm à 2 000 kg/m³). */
export function chargeKgParM2(epaisseurCm: number, masseVolumiqueKgM3 = 2000): number {
  return arrondi((masseVolumiqueKgM3 / 100) * epaisseurCm, 1);
}

/**
 * Épaisseur moyenne qui remplirait exactement la dernière toupie, en cm,
 * pour proposer un arrondi au métreur. Null si la dernière toupie est déjà quasi pleine.
 */
export function epaisseurPourToupiePleine(q: Quantites, capaciteToupieM3: number, tauxPertes: number): number | null {
  if (q.surfaceM2 <= 0 || q.nombreToupies === 0) return null;
  if (q.resteDerniereToupieM3 < 0.2) return null;
  const volumeCible = (q.nombreToupies * capaciteToupieM3) / (1 + tauxPertes);
  return arrondi((volumeCible / q.surfaceM2) * 100, 1);
}
