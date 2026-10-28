import type { Alerte, ConfigurationChape, Piece } from "./types";

/**
 * Épaisseurs minimales et maximales, en cm, d'après les Règles professionnelles 2023.
 *
 * - Sulfate de calcium : Tableau 8 (§ 11.3.6), maximum 6 cm, 8 cm en enrobage de plancher chauffant.
 * - Ciment C20-F4 : Tableau 4 (§ 10.3.8) ; ciment C16-F3/F4 : Tableau 5.
 * - Plancher chauffant : § 12.1.1.2 (ciment) et § 12.2.1.2 (sulfate de calcium).
 */

export interface LimitesEpaisseur {
  minCm: number;
  maxCm: number | null;
  /** Explication lisible de la règle retenue. */
  regle: string;
  reference: string;
}

const SC_MAX_CM = 6;
const SC_MAX_PLANCHER_CHAUFFANT_CM = 8;
/** Ciment : 10 cm maximum sous sols souples, parquets et résines (RP § 10.3.8). */
const CIMENT_MAX_SOUS_SOUPLE_CM = 10;

function minimumSulfateCalcium(config: ConfigurationChape): { minCm: number; regle: string } {
  const p3 = config.classeLocal !== "P2";
  if (config.modePose === "flottante") {
    if (config.classeIsolant === "SC2") {
      return { minCm: p3 ? 4.5 : 4, regle: "Chape flottante sur isolant SC2" };
    }
    return { minCm: p3 ? 4 : 3.5, regle: "Chape flottante sur isolant SC1" };
  }
  // Le sulfate de calcium se pose désolidarisé (recommandation C2P) ; une pose
  // « adhérente » est traitée comme désolidarisée sur support courant.
  if (config.support === "ravoirage" || config.support === "asphalte") {
    return { minCm: 4, regle: "Chape désolidarisée sur ravoirage ou asphalte" };
  }
  return {
    minCm: p3 ? 3 : 2.5,
    regle: "Chape désolidarisée sur maçonnerie, béton, dallage, bois ou ancien revêtement",
  };
}

function minimumCiment(config: ConfigurationChape): { minCm: number; regle: string } {
  const fibree = config.fibree === true;
  const c20 = config.classe !== "C16-F3" && config.classe !== "C16-F4";
  const p4 = config.classeLocal === "P4";

  if (c20) {
    // Tableau 4 : C20-F4.
    switch (config.modePose) {
      case "adherente":
        return p4
          ? { minCm: fibree ? 4 : 5, regle: "Chape adhérente, locaux P4" }
          : { minCm: 3, regle: "Chape adhérente, locaux P2 et P3" };
      case "desolidarisee":
        return p4
          ? { minCm: 5, regle: "Chape désolidarisée sur film, locaux P4" }
          : { minCm: 3, regle: "Chape désolidarisée sur film, locaux P2 et P3" };
      case "flottante":
        if (config.classeIsolant === "SC2") {
          return { minCm: fibree ? 4.5 : 5, regle: "Chape flottante sur isolant SC2" };
        }
        return { minCm: 4, regle: "Chape flottante sur isolant SC1" };
    }
  }
  // Tableau 5 : C16-F3/F4, locaux P2 et P3 uniquement.
  switch (config.modePose) {
    case "adherente":
      return { minCm: 3, regle: "Chape adhérente (C16)" };
    case "desolidarisee":
      return { minCm: 4, regle: "Chape désolidarisée sur film (C16)" };
    case "flottante":
      if (config.classeIsolant === "SC2") {
        return { minCm: fibree ? 4.5 : 5, regle: "Chape flottante sur isolant SC2 (C16)" };
      }
      return { minCm: fibree ? 4 : 4.5, regle: "Chape flottante sur isolant SC1 (C16)" };
  }
}

/**
 * Épaisseur totale minimale imposée par un plancher chauffant, en cm, ou null s'il n'y en a pas.
 * Les épaisseurs « au-dessus du tube » sont converties en épaisseur totale en ajoutant le diamètre du tube.
 */
export function minimumPlancherChauffant(config: ConfigurationChape): { minCm: number; regle: string } | null {
  const pc = config.plancherChauffant;
  switch (pc.type) {
    case "aucun":
      return null;
    case "eau_A": {
      const dessus = pc.isolantAPlots ? 2.5 : 3;
      return {
        minCm: dessus + pc.diametreTubeMm / 10,
        regle: `${dessus * 10} mm au-dessus du tube de ${pc.diametreTubeMm} mm (plancher chauffant à eau, type A)`,
      };
    }
    case "eau_C":
      return {
        minCm: 2 + pc.diametreTubeMm / 10,
        regle: `20 mm au-dessus du tube de ${pc.diametreTubeMm} mm (plancher chauffant à eau, type C)`,
      };
    case "electrique":
      return config.classeIsolant === "SC2"
        ? { minCm: 4.5, regle: "45 mm minimum sur isolant SC2 (plancher rayonnant électrique)" }
        : { minCm: 4, regle: "40 mm minimum sur isolant SC1 (plancher rayonnant électrique)" };
  }
}

/** Limites d'épaisseur applicables à une configuration. */
export function limitesEpaisseur(config: ConfigurationChape): LimitesEpaisseur {
  const base =
    config.liant === "sulfate_calcium" ? minimumSulfateCalcium(config) : minimumCiment(config);
  const reference =
    config.liant === "sulfate_calcium" ? "RP § 11.3.6, Tableau 8" : "RP § 10.3.8, Tableaux 4 et 5";

  let minCm = base.minCm;
  let regle = base.regle;
  let ref = reference;

  const pc = minimumPlancherChauffant(config);
  if (pc && pc.minCm > minCm) {
    minCm = pc.minCm;
    regle = pc.regle;
    ref = config.liant === "sulfate_calcium" ? "RP § 12.2.1.2" : "RP § 12.1.1.2";
  }

  let maxCm: number | null = null;
  if (config.liant === "sulfate_calcium") {
    maxCm = config.plancherChauffant.type === "aucun" ? SC_MAX_CM : SC_MAX_PLANCHER_CHAUFFANT_CM;
  } else if (["pvc", "linoleum", "caoutchouc", "parquet", "textile", "resine"].includes(config.revetement)) {
    maxCm = CIMENT_MAX_SOUS_SOUPLE_CM;
  }

  return { minCm, maxCm, regle, reference: ref };
}

/** Contrôle l'épaisseur de chaque pièce : bloquant sous le minimum, attention au-dessus du maximum. */
export function controlerEpaisseurs(pieces: Piece[], config: ConfigurationChape): Alerte[] {
  const limites = limitesEpaisseur(config);
  const alertes: Alerte[] = [];
  for (const piece of pieces) {
    if (piece.epaisseurCm < limites.minCm) {
      alertes.push({
        code: "epaisseur_insuffisante",
        severite: "bloquant",
        message: `${piece.nom} : ${piece.epaisseurCm} cm, minimum ${limites.minCm} cm (${limites.regle}).`,
        reference: limites.reference,
      });
    } else if (limites.maxCm !== null && piece.epaisseurCm > limites.maxCm) {
      alertes.push({
        code: "epaisseur_excessive",
        severite: "attention",
        message: `${piece.nom} : ${piece.epaisseurCm} cm, maximum ${limites.maxCm} cm pour cette configuration.`,
        reference: limites.reference,
      });
    }
  }
  return alertes;
}
