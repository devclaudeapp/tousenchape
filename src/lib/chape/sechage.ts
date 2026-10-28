import type { Liant, Revetement } from "./types";

/**
 * Séchage, jalons après coulage et seuils d'humidité résiduelle.
 */

const JOUR_MS = 24 * 60 * 60 * 1000;

export function ajouterJours(date: Date, jours: number): Date {
  return new Date(date.getTime() + jours * JOUR_MS);
}

/**
 * Durée de séchage estimée, en semaines : une semaine par cm jusqu'à 4 cm, puis deux semaines par cm.
 * Règle de métier courante, cohérente avec les fiches Anhydritec (4 cm ≈ 4 semaines, 5 cm ≈ 6 semaines).
 * Une mise en chauffe du plancher fait gagner une semaine (fourchette fabricant : 1 à 2 semaines).
 * Cette durée est indicative : seule la mesure CM autorise la pose du revêtement.
 */
export function semainesSechageEstimees(epaisseurCm: number, miseEnChauffe = false): number {
  if (epaisseurCm <= 0) return 0;
  const base = epaisseurCm <= 4 ? epaisseurCm : 4 + (epaisseurCm - 4) * 2;
  const gain = miseEnChauffe ? 1 : 0;
  return Math.max(1, Math.round((base - gain) * 10) / 10);
}

export function dateSechageEstimee(dateCoulage: Date, epaisseurCm: number, miseEnChauffe = false): Date {
  return ajouterJours(dateCoulage, semainesSechageEstimees(epaisseurCm, miseEnChauffe) * 7);
}

export interface Jalon {
  code: string;
  libelle: string;
  /** Délai minimal (ou maximal si `maximal` vaut true) après le coulage. */
  heures: number;
  maximal?: boolean;
  date: Date;
  reference: string;
}

/** Jalons automatiques après coulage (RP § 10.5, 11.5, 13 et 14 ; délais produit pour la mise en chauffe). */
export function jalonsApresCoulage(
  dateCoulage: Date,
  liant: Liant,
  options: { plancherChauffant?: boolean; miseEnChauffeJoursMin?: number } = {},
): Jalon[] {
  const j = (code: string, libelle: string, heures: number, reference: string, maximal = false): Jalon => ({
    code,
    libelle,
    heures,
    maximal,
    date: new Date(dateCoulage.getTime() + heures * 60 * 60 * 1000),
    reference,
  });

  const jalons: Jalon[] = [
    j("circulation", "Circulation piétonne modérée possible", 24, "RP § 10.5.3 / 11.5.3"),
    j("aeration", "Aération du local possible", 24, "RP § 10.5.2 / 11.5.2"),
    j("charges_fixes", "Fin de l'interdiction des charges fixes", 72, "RP § 10.5.1 / 11.5.1"),
    j("second_oeuvre", "Accès des autres corps d'état (hors solier)", 72, "RP § 10.5.3 / 11.5.3"),
  ];

  if (liant === "ciment") {
    jalons.push(j("deshumidificateur", "Déshumidificateur à envisager sans aération", 4 * 24, "RP § 10.5.2"));
  } else {
    jalons.push(
      j("controle_surface", "Contrôle de surface d'une chape sans pellicule", 4 * 24, "RP § 11.5.6"),
    );
  }

  if (options.plancherChauffant) {
    const jours = options.miseEnChauffeJoursMin ?? 7;
    jalons.push(
      j("mise_en_chauffe", "Première mise en chauffe possible (par le chauffagiste)", jours * 24, "DTA produit / RP § 12"),
    );
  }

  jalons.push(j("cloisons", "Pose de cloisons légères sur chape flottante", 7 * 24, "RP § 13"));

  if (liant === "ciment") {
    jalons.push(
      j("revetement_max", "Pose du revêtement au plus tard (ponçage 8 jours au plus avant)", 8 * 7 * 24, "RP § 7", true),
    );
  }

  return jalons.sort((a, b) => a.heures - b.heures);
}

/**
 * Humidité résiduelle maximale admise (méthode CM, % en masse) pour une chape au sulfate de calcium (RP Tableau 13).
 * Pour le ciment, le seuil vient du DTU ou du CPT du revêtement : l'appelant doit le fournir.
 */
export function seuilHumiditeCM(
  liant: Liant,
  revetement: Revetement,
  options: { specPleineSurface?: boolean; seuilCiment?: number } = {},
): number | null {
  if (liant === "ciment") return options.seuilCiment ?? null;
  if (options.specPleineSurface) return 0.5;
  switch (revetement) {
    case "carrelage":
    case "pierre":
      return 1;
    case "pvc":
    case "linoleum":
    case "caoutchouc":
    case "parquet":
    case "textile":
    case "resine":
      return 0.5;
    case "inconnu":
      return 0.5;
  }
}

/** Nombre minimal de prélèvements CM : 2 par local de moins de 100 m², puis 1 par tranche de 100 m² supplémentaires (RP § 14.2.2). */
export function nombrePrelevementsCM(surfaceM2: number): number {
  if (surfaceM2 <= 0) return 0;
  if (surfaceM2 < 100) return 2;
  return 2 + Math.ceil((surfaceM2 - 100) / 100);
}
