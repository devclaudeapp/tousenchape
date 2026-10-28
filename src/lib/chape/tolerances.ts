/**
 * Tolérances d'exécution (RP § 10.6, 10.7 et 11.6).
 */

/** Écart de planéité maximal en mm : 3 mm sous la règle de 2 m, 1 mm sous la règle de 20 cm. */
export const PLANEITE_MAX_MM = { regle2m: 3, regle20cm: 1 } as const;

export function planeiteConforme(ecartMm: number, regle: "2m" | "20cm"): boolean {
  return ecartMm <= (regle === "2m" ? PLANEITE_MAX_MM.regle2m : PLANEITE_MAX_MM.regle20cm);
}

/** Tolérance de niveau en mm : ± (5 + 1 × d), d étant la distance en m au point de référence le plus proche. */
export function toleranceNiveauMm(distanceReferenceM: number): number {
  return Math.round((0.005 + 0.001 * distanceReferenceM) * 1000 * 100) / 100;
}

export function niveauConforme(ecartMm: number, distanceReferenceM: number): boolean {
  return Math.abs(ecartMm) <= toleranceNiveauMm(distanceReferenceM);
}

/** Fissures : sous 0,3 mm, aucune réparation ; au-delà, traitement par coulis ou résine (RP § 10.5.5). */
export function fissureAReparer(largeurMm: number): boolean {
  return largeurMm > 0.3;
}
