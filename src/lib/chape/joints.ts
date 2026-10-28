import type { ConfigurationChape, Piece } from "./types";

/**
 * Joints de fractionnement (RP § 10.5.4, 11.5.5, 12.1.1.4 et 12.2.1.3).
 *
 * | Liant              | Cas                              | Sans joint jusqu'à | Longueur max |
 * | Ciment             | général                          | 60 m²              | 10 m         |
 * | Ciment             | retrait ≤ 600 µm/m (QB46)        | 80 m²              | 14 m         |
 * | Ciment             | retrait ≤ 400 µm/m (QB46)        | 100 m²             | 14 m         |
 * | Ciment             | plancher chauffant               | 40 m²              | 8 m          |
 * | Sulfate de calcium | général                          | 1 000 m²           | 45 m         |
 * | Sulfate de calcium | plancher chauffant               | 300 m²             | 25 m         |
 */

export interface SeuilsJoints {
  surfaceMaxM2: number;
  longueurMaxM: number;
  reference: string;
}

export interface EvaluationJoints {
  piece: Piece;
  seuils: SeuilsJoints;
  necessaire: boolean;
  motifs: string[];
}

export function seuilsJoints(config: ConfigurationChape): SeuilsJoints {
  const chauffant = config.plancherChauffant.type !== "aucun";
  if (config.liant === "sulfate_calcium") {
    return chauffant
      ? { surfaceMaxM2: 300, longueurMaxM: 25, reference: "RP § 12.2.1.3" }
      : { surfaceMaxM2: 1000, longueurMaxM: 45, reference: "RP § 11.5.5" };
  }
  if (chauffant) return { surfaceMaxM2: 40, longueurMaxM: 8, reference: "RP § 12.1.1.4" };
  const retrait = config.retraitEngageUmParM;
  if (retrait !== undefined && retrait <= 400) {
    return { surfaceMaxM2: 100, longueurMaxM: 14, reference: "RP § 10.5.4, Tableau 6" };
  }
  if (retrait !== undefined && retrait <= 600) {
    return { surfaceMaxM2: 80, longueurMaxM: 14, reference: "RP § 10.5.4, Tableau 6" };
  }
  return { surfaceMaxM2: 60, longueurMaxM: 10, reference: "RP § 10.5.4" };
}

/** Évalue, pièce par pièce, si un fractionnement est nécessaire. */
export function evaluerJoints(pieces: Piece[], config: ConfigurationChape): EvaluationJoints[] {
  const seuils = seuilsJoints(config);
  return pieces.map((piece) => {
    const motifs: string[] = [];
    if (piece.surfaceM2 > seuils.surfaceMaxM2) {
      motifs.push(`surface de ${piece.surfaceM2} m² supérieure à ${seuils.surfaceMaxM2} m²`);
    }
    if (piece.longueurMaxM !== undefined && piece.longueurMaxM > seuils.longueurMaxM) {
      motifs.push(`longueur de ${piece.longueurMaxM} m supérieure à ${seuils.longueurMaxM} m`);
    }
    return { piece, seuils, necessaire: motifs.length > 0, motifs };
  });
}

/**
 * Nombre minimal de zones de fractionnement d'une pièce pour respecter la surface maximale.
 * Simplification : l'outil ne dessine pas les joints, il compte les zones.
 */
export function nombreZonesFractionnement(piece: Piece, config: ConfigurationChape): number {
  const seuils = seuilsJoints(config);
  const parSurface = Math.ceil(piece.surfaceM2 / seuils.surfaceMaxM2);
  const parLongueur =
    piece.longueurMaxM !== undefined ? Math.ceil(piece.longueurMaxM / seuils.longueurMaxM) : 1;
  return Math.max(1, parSurface, parLongueur);
}
