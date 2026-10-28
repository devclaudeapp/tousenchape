/**
 * Habilitations et documents d'un compagnon, avec leur durée de validité usuelle.
 * Les durées sont des valeurs par défaut pour pré-remplir la date de fin ; la date saisie fait foi.
 */

export type TypeHabilitation =
  | "carte_btp"
  | "caces"
  | "aipr"
  | "habilitation_electrique"
  | "sst"
  | "visite_medicale"
  | "travail_hauteur"
  | "pompe_chape"
  | "permis_b"
  | "permis_be"
  | "permis_c"
  | "autre";

export interface Habilitation {
  id: string;
  type: TypeHabilitation;
  libelle?: string;
  numero?: string;
  organisme?: string;
  dateObtention?: string;
  /** Date de fin de validité (ISO AAAA-MM-JJ) ; absente si l'habilitation n'expire pas. */
  dateFin?: string;
}

export const CATALOGUE_HABILITATIONS: Record<TypeHabilitation, { libelle: string; validiteAnnees: number | null; obligatoire?: string }> = {
  carte_btp: { libelle: "Carte BTP (carte d'identification professionnelle)", validiteAnnees: 5, obligatoire: "Obligatoire pour tout salarié sur chantier" },
  caces: { libelle: "CACES (chariot, nacelle…)", validiteAnnees: 5 },
  aipr: { libelle: "AIPR (travaux à proximité des réseaux)", validiteAnnees: 5 },
  habilitation_electrique: { libelle: "Habilitation électrique (BS, BE manœuvre)", validiteAnnees: 3 },
  sst: { libelle: "Sauveteur secouriste du travail", validiteAnnees: 2 },
  visite_medicale: { libelle: "Visite médicale (suivi individuel renforcé)", validiteAnnees: 2 },
  travail_hauteur: { libelle: "Travail en hauteur, port du harnais", validiteAnnees: 3 },
  pompe_chape: { libelle: "Conduite de la pompe à chape (formation interne)", validiteAnnees: null },
  permis_b: { libelle: "Permis B", validiteAnnees: null },
  permis_be: { libelle: "Permis BE (remorque)", validiteAnnees: null },
  permis_c: { libelle: "Permis C (poids lourd)", validiteAnnees: 5 },
  autre: { libelle: "Autre", validiteAnnees: null },
};

export type EtatValidite = "valide" | "expire_bientot" | "expiree" | "sans_echeance";

/** État d'une date de fin : expirée, à renouveler sous `seuilJours` jours, ou valide. */
export function etatValidite(dateFin: string | undefined, aujourdHui: Date, seuilJours = 60): { etat: EtatValidite; joursRestants: number | null } {
  if (!dateFin) return { etat: "sans_echeance", joursRestants: null };
  const fin = new Date(`${dateFin}T00:00:00`);
  const debut = new Date(aujourdHui);
  debut.setHours(0, 0, 0, 0);
  const jours = Math.round((fin.getTime() - debut.getTime()) / 86400000);
  if (jours < 0) return { etat: "expiree", joursRestants: jours };
  if (jours <= seuilJours) return { etat: "expire_bientot", joursRestants: jours };
  return { etat: "valide", joursRestants: jours };
}

/** Date de fin proposée à la saisie, d'après la validité usuelle du type. */
export function dateFinProposee(type: TypeHabilitation, dateObtention: string): string | undefined {
  const annees = CATALOGUE_HABILITATIONS[type].validiteAnnees;
  if (annees === null) return undefined;
  const d = new Date(`${dateObtention}T00:00:00`);
  d.setFullYear(d.getFullYear() + annees);
  return d.toISOString().slice(0, 10);
}

export const TYPES_CONTRAT = ["cdi", "cdd", "interim", "apprenti", "gerant"] as const;
export type TypeContrat = (typeof TYPES_CONTRAT)[number];
export const libelleContrat: Record<TypeContrat, string> = { cdi: "CDI", cdd: "CDD", interim: "Intérim", apprenti: "Apprenti", gerant: "Gérant" };

export const MOTIFS_INDISPONIBILITE = ["conge", "maladie", "formation", "autre"] as const;
export type MotifIndisponibilite = (typeof MOTIFS_INDISPONIBILITE)[number];
export const libelleMotif: Record<MotifIndisponibilite, string> = { conge: "Congé", maladie: "Maladie", formation: "Formation", autre: "Autre" };
