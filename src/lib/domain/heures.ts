/**
 * Feuille d'heures et variables de paie du BTP.
 *
 * L'outil ne fait pas la paie : il compte les heures et les indemnités selon des règles
 * paramétrables par l'entreprise, et les exporte pour l'expert-comptable ou le logiciel de paie.
 *
 * Valeurs par défaut (convention collective des ouvriers du bâtiment, à ajuster par l'entreprise) :
 * - durée légale hebdomadaire 35 h ; heures supplémentaires majorées de 25 % de la 36e à la 43e heure,
 *   de 50 % au-delà ;
 * - indemnité de repas (panier) due pour chaque journée travaillée sur chantier ;
 * - indemnités de petit déplacement (trajet et transport) par zone concentrique autour du dépôt ;
 * - grand déplacement quand le salarié ne peut pas rentrer le soir.
 */

export type TypePointage = "chantier" | "depot" | "trajet" | "formation" | "autre";
export type StatutPointage = "saisi" | "valide_chef" | "valide_bureau" | "refuse";

export interface PointageCalculable {
  membreId: string;
  /** Date ISO AAAA-MM-JJ de la journée. */
  date: string;
  /** Heures ISO complètes. */
  debut: string;
  fin?: string;
  pauseMin: number;
  type: TypePointage;
  /** Zone de petit déplacement (1 à 5), null si aucune indemnité. */
  zoneTrajet?: number | null;
  panier: boolean;
  grandDeplacement: boolean;
  statut: StatutPointage;
}

export interface ParametresPaie {
  dureeHebdoH: number;
  seuilMajoration50H: number;
  /** Montant de l'indemnité de repas, en €. */
  panierEuros: number;
  /** Indemnités de petit déplacement par zone (trajet + transport), en € par jour. */
  zonesTrajetEuros: Record<number, number>;
  /** Indemnité forfaitaire de grand déplacement, en € par jour. */
  grandDeplacementEuros: number;
}

export const PARAMETRES_PAIE_DEFAUT: ParametresPaie = {
  dureeHebdoH: 35,
  seuilMajoration50H: 43,
  panierEuros: 11.0,
  zonesTrajetEuros: { 1: 8.2, 2: 12.4, 3: 16.6, 4: 20.8, 5: 25.0 },
  grandDeplacementEuros: 95.0,
};

/** Durée travaillée d'un pointage, en heures décimales (pause déduite), 0 s'il n'est pas terminé. */
export function dureeHeures(p: Pick<PointageCalculable, "debut" | "fin" | "pauseMin">): number {
  if (!p.fin) return 0;
  const minutes = (new Date(p.fin).getTime() - new Date(p.debut).getTime()) / 60000 - p.pauseMin;
  return Math.max(0, Math.round((minutes / 60) * 100) / 100);
}

/** Lundi (ISO AAAA-MM-JJ) de la semaine d'une date. */
export function lundiDe(dateIso: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export interface Semaine {
  lundi: string;
  heures: number;
  normales: number;
  sup25: number;
  sup50: number;
}

/** Répartit les heures d'une semaine entre normales, majorées à 25 % et à 50 %. */
export function repartirSemaine(heures: number, params: ParametresPaie = PARAMETRES_PAIE_DEFAUT): Omit<Semaine, "lundi" | "heures"> {
  const normales = Math.min(heures, params.dureeHebdoH);
  const sup25 = Math.min(Math.max(0, heures - params.dureeHebdoH), params.seuilMajoration50H - params.dureeHebdoH);
  const sup50 = Math.max(0, heures - params.seuilMajoration50H);
  const r = (x: number) => Math.round(x * 100) / 100;
  return { normales: r(normales), sup25: r(sup25), sup50: r(sup50) };
}

export interface VariablesPaie {
  membreId: string;
  mois: string;
  joursTravailles: number;
  heures: number;
  normales: number;
  sup25: number;
  sup50: number;
  paniers: number;
  trajetsParZone: Record<number, number>;
  grandsDeplacements: number;
  indemnitesEuros: number;
  semaines: Semaine[];
  /** Pointages non validés par le bureau, exclus du calcul. */
  enAttente: number;
}

/**
 * Variables de paie d'un salarié pour un mois (AAAA-MM), à partir des pointages validés par le bureau.
 * Les semaines à cheval sur deux mois sont comptées entières dans le mois de leur lundi, comme en paie.
 */
export function variablesPaieMois(
  membreId: string,
  mois: string,
  pointages: PointageCalculable[],
  params: ParametresPaie = PARAMETRES_PAIE_DEFAUT,
): VariablesPaie {
  const miens = pointages.filter((p) => p.membreId === membreId);
  const enAttente = miens.filter((p) => p.date.startsWith(mois) && p.statut !== "valide_bureau" && p.statut !== "refuse").length;
  const valides = miens.filter((p) => p.statut === "valide_bureau");

  // Semaines dont le lundi tombe dans le mois.
  const parSemaine = new Map<string, number>();
  for (const p of valides) {
    const lundi = lundiDe(p.date);
    if (!lundi.startsWith(mois)) continue;
    parSemaine.set(lundi, (parSemaine.get(lundi) ?? 0) + dureeHeures(p));
  }
  const semaines: Semaine[] = [...parSemaine.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([lundi, heures]) => ({ lundi, heures: Math.round(heures * 100) / 100, ...repartirSemaine(heures, params) }));

  // Indemnités : par journée du mois.
  const duMois = valides.filter((p) => p.date.startsWith(mois));
  const jours = new Set(duMois.filter((p) => dureeHeures(p) > 0).map((p) => p.date));
  const joursPanier = new Set(duMois.filter((p) => p.panier).map((p) => p.date));
  const joursGD = new Set(duMois.filter((p) => p.grandDeplacement).map((p) => p.date));
  const trajetsParZone: Record<number, number> = {};
  const joursTrajet = new Map<string, number>();
  for (const p of duMois) {
    if (p.zoneTrajet && !p.grandDeplacement) joursTrajet.set(p.date, Math.max(joursTrajet.get(p.date) ?? 0, p.zoneTrajet));
  }
  for (const zone of joursTrajet.values()) trajetsParZone[zone] = (trajetsParZone[zone] ?? 0) + 1;

  const somme = (xs: number[]) => Math.round(xs.reduce((s, x) => s + x, 0) * 100) / 100;
  const indemnites =
    joursPanier.size * params.panierEuros +
    joursGD.size * params.grandDeplacementEuros +
    Object.entries(trajetsParZone).reduce((s, [z, n]) => s + n * (params.zonesTrajetEuros[Number(z)] ?? 0), 0);

  return {
    membreId,
    mois,
    joursTravailles: jours.size,
    heures: somme(semaines.map((s) => s.heures)),
    normales: somme(semaines.map((s) => s.normales)),
    sup25: somme(semaines.map((s) => s.sup25)),
    sup50: somme(semaines.map((s) => s.sup50)),
    paniers: joursPanier.size,
    trajetsParZone,
    grandsDeplacements: joursGD.size,
    indemnitesEuros: Math.round(indemnites * 100) / 100,
    semaines,
    enAttente,
  };
}

/** Lignes CSV (séparateur point-virgule, décimales à la virgule) pour l'expert-comptable. */
export function csvVariablesPaie(lignes: { nom: string; matricule?: string; v: VariablesPaie }[]): string {
  const dec = (x: number) => x.toFixed(2).replace(".", ",");
  const entete = ["Matricule", "Nom", "Mois", "Jours travaillés", "Heures totales", "Heures normales", "Heures sup 25 %", "Heures sup 50 %", "Paniers", "Trajets zone 1", "Trajets zone 2", "Trajets zone 3", "Trajets zone 4", "Trajets zone 5", "Grands déplacements", "Indemnités (€)", "Pointages en attente"];
  const corps = lignes.map(({ nom, matricule, v }) =>
    [matricule ?? "", nom, v.mois, v.joursTravailles, dec(v.heures), dec(v.normales), dec(v.sup25), dec(v.sup50), v.paniers, v.trajetsParZone[1] ?? 0, v.trajetsParZone[2] ?? 0, v.trajetsParZone[3] ?? 0, v.trajetsParZone[4] ?? 0, v.trajetsParZone[5] ?? 0, v.grandsDeplacements, dec(v.indemnitesEuros), v.enAttente].join(";"),
  );
  return [entete.join(";"), ...corps].join("\r\n");
}

/** Zone de petit déplacement d'après la distance à vol d'oiseau au dépôt, en km (zones de 10 km, 5 au plus). */
export function zoneDepuisDistance(distanceKm: number): number | null {
  if (distanceKm <= 0) return null;
  return Math.min(5, Math.ceil(distanceKm / 10));
}

/** Distance à vol d'oiseau entre deux points GPS, en km (formule de haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}
