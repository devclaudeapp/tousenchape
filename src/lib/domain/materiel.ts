import { etatValidite, type EtatValidite } from "@/lib/domain/habilitations";
import type { Materiel, TypeControleMateriel, TypeMateriel } from "@/lib/domain/types";

export const libelleTypeMateriel: Record<TypeMateriel, string> = {
  pompe: "Pompe à chape",
  malaxeur: "Malaxeur",
  camion: "Véhicule",
  laser: "Niveau laser",
  bombe_cm: "Bombe à carbure (CM)",
  autre: "Autre",
};

export const libelleTypeControle: Record<TypeControleMateriel, string> = {
  vgp: "Vérification générale périodique (VGP)",
  entretien: "Entretien",
  controle_technique: "Contrôle technique",
  etalonnage: "Étalonnage",
  autre: "Autre contrôle",
};

/** Périodicité usuelle des contrôles, en mois, pour proposer la prochaine échéance. */
export const PERIODICITE_MOIS: Record<TypeControleMateriel, number> = { vgp: 12, entretien: 6, controle_technique: 24, etalonnage: 12, autre: 12 };

/** Prochaine échéance d'un matériel : la plus proche de ses contrôles, avec son état. */
export function prochaineEcheance(m: Materiel, aujourdHui: Date): { date?: string; libelle?: string; etat: EtatValidite; joursRestants: number | null } {
  const avecDate = m.controles.filter((c) => c.prochaineDate).sort((a, b) => a.prochaineDate!.localeCompare(b.prochaineDate!));
  const premier = avecDate[0];
  if (!premier) return { etat: "sans_echeance", joursRestants: null };
  const { etat, joursRestants } = etatValidite(premier.prochaineDate, aujourdHui, 30);
  return { date: premier.prochaineDate, libelle: premier.libelle ?? libelleTypeControle[premier.type], etat, joursRestants };
}
