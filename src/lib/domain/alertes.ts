import { CATALOGUE_HABILITATIONS, etatValidite } from "@/lib/domain/habilitations";
import type { Chantier, DocumentEntreprise, Entreprise, Equipe, Facture, Indisponibilite, Materiel, Membre, Message, Pointage } from "@/lib/domain/types";
import { prochaineEcheance } from "@/lib/domain/materiel";

/**
 * Alertes du patron : tout ce qui demande une décision ou une action, calculé à partir des données.
 */

export type NiveauAlerte = "urgent" | "attention" | "info";

export interface AlertePatron {
  code: string;
  niveau: NiveauAlerte;
  titre: string;
  detail?: string;
  lien?: string;
}

const dansJours = (dateIso: string, aujourdHui: Date) => Math.round((new Date(`${dateIso}T00:00:00`).getTime() - new Date(aujourdHui.toISOString().slice(0, 10) + "T00:00:00").getTime()) / 86400000);

export function indisponibleLe(indispos: Indisponibilite[], membreId: string, dateIso: string): Indisponibilite | undefined {
  return indispos.find((i) => i.membreId === membreId && i.debut <= dateIso && i.fin >= dateIso);
}

export function calculerAlertes(input: {
  aujourdHui: Date;
  entreprise: Entreprise;
  membres: Membre[];
  equipes: Equipe[];
  chantiers: Chantier[];
  factures: Facture[];
  indisponibilites: Indisponibilite[];
  messages: Message[];
  materiels?: Materiel[];
  documents?: DocumentEntreprise[];
  pointages?: Pointage[];
}): AlertePatron[] {
  const { aujourdHui, entreprise, membres, equipes, chantiers, factures, indisponibilites, messages, materiels = [], documents = [], pointages = [] } = input;
  const alertes: AlertePatron[] = [];
  const jour = aujourdHui.toISOString().slice(0, 10);

  // Assurance décennale.
  if (entreprise.attestationDecennaleExpireLe) {
    const { etat, joursRestants } = etatValidite(entreprise.attestationDecennaleExpireLe, aujourdHui, 60);
    if (etat === "expiree") alertes.push({ code: "decennale_expiree", niveau: "urgent", titre: "Attestation décennale expirée", detail: "Aucun devis ne devrait partir sans attestation à jour.", lien: "/app/parametres" });
    else if (etat === "expire_bientot") alertes.push({ code: "decennale_bientot", niveau: "attention", titre: `Attestation décennale à renouveler dans ${joursRestants} jours`, lien: "/app/parametres" });
  } else {
    alertes.push({ code: "decennale_absente", niveau: "attention", titre: "Date de validité de l'attestation décennale non renseignée", lien: "/app/parametres" });
  }

  // Habilitations des compagnons.
  for (const m of membres.filter((x) => x.actif)) {
    for (const h of m.habilitations) {
      const { etat, joursRestants } = etatValidite(h.dateFin, aujourdHui, 60);
      const libelle = h.libelle ?? CATALOGUE_HABILITATIONS[h.type].libelle;
      if (etat === "expiree") alertes.push({ code: `hab_expiree_${m.id}_${h.id}`, niveau: "urgent", titre: `${m.nom} : ${libelle} expirée`, lien: `/app/equipe/${m.id}` });
      else if (etat === "expire_bientot") alertes.push({ code: `hab_bientot_${m.id}_${h.id}`, niveau: "attention", titre: `${m.nom} : ${libelle} expire dans ${joursRestants} jours`, lien: `/app/equipe/${m.id}` });
    }
  }

  // Chantiers planifiés : équipe, chef CQP, absence, date.
  const aVenir = chantiers.filter((c) => !["facture", "clos"].includes(c.statut));
  for (const c of aVenir) {
    const lien = `/app/chantiers/${c.id}`;
    if (!c.dateCoulage) {
      alertes.push({ code: `sans_date_${c.id}`, niveau: "info", titre: `${c.numero} : coulage à planifier`, lien });
      continue;
    }
    if (c.statut === "sechage" || c.statut === "reception" || c.statut === "coule") continue;
    const j = dansJours(c.dateCoulage, aujourdHui);
    const chef = membres.find((m) => m.id === c.chefEquipeId);
    if (!chef) alertes.push({ code: `sans_chef_${c.id}`, niveau: j <= 7 ? "urgent" : "attention", titre: `${c.numero} : aucun chef d'équipe affecté pour le ${c.dateCoulage.split("-").reverse().join("/")}`, lien });
    else {
      if (!chef.cqpNumero) alertes.push({ code: `sans_cqp_${c.id}`, niveau: "urgent", titre: `${c.numero} : ${chef.nom} n'a pas le CQP chapiste`, detail: "Obligatoire sur chaque chantier depuis le 1er août 2024.", lien });
      const absence = indisponibleLe(indisponibilites, chef.id, c.dateCoulage);
      if (absence) alertes.push({ code: `chef_absent_${c.id}`, niveau: "urgent", titre: `${c.numero} : ${chef.nom} est absent le jour du coulage`, detail: absence.motif, lien });
    }
    if (c.statut === "planifie" && j <= 2 && j >= 0) alertes.push({ code: `visite_manquante_${c.id}`, niveau: "attention", titre: `${c.numero} : coulage dans ${j} jour${j > 1 ? "s" : ""} sans visite technique conforme`, lien });
  }

  // Équipes sans chef titulaire du CQP.
  for (const e of equipes) {
    const chef = membres.find((m) => m.id === e.chefId);
    if (!chef) alertes.push({ code: `equipe_sans_chef_${e.id}`, niveau: "attention", titre: `${e.nom} : pas de chef d'équipe désigné`, lien: "/app/equipe" });
    else if (!chef.cqpNumero) alertes.push({ code: `equipe_chef_sans_cqp_${e.id}`, niveau: "attention", titre: `${e.nom} : ${chef.nom} n'a pas le CQP chapiste`, lien: `/app/equipe/${chef.id}` });
  }

  // Factures en retard.
  for (const f of factures) {
    if (f.statut === "annulee" || f.statut === "payee") continue;
    const reste = f.totalTTC - f.paiements.reduce((s, p) => s + p.montant, 0);
    if (reste > 0 && f.dateEcheance < jour) {
      const retard = -dansJours(f.dateEcheance, aujourdHui);
      alertes.push({ code: `facture_retard_${f.id}`, niveau: retard > 30 ? "urgent" : "attention", titre: `Facture ${f.numero} en retard de ${retard} jours`, detail: `${reste.toFixed(2)} € restant dus`, lien: "/app/factures" });
    }
  }

  // Signalements du terrain non traités.
  for (const msg of messages.filter((m) => m.signalement && !m.traiteLe)) {
    const auteur = membres.find((m) => m.id === msg.auteurId);
    const chantier = chantiers.find((c) => c.id === msg.chantierId);
    alertes.push({ code: `signalement_${msg.id}`, niveau: "urgent", titre: `Signalement de ${auteur?.nom ?? "l'équipe"} sur ${chantier?.numero ?? "un chantier"}`, detail: msg.texte.slice(0, 120), lien: `/app/chantiers/${msg.chantierId}#fil` });
  }

  // Matériel : contrôles périodiques.
  for (const m of materiels.filter((x) => x.actif)) {
    const e = prochaineEcheance(m, aujourdHui);
    if (e.etat === "expiree") alertes.push({ code: `materiel_retard_${m.id}`, niveau: "urgent", titre: `${m.nom} : ${e.libelle} en retard de ${Math.abs(e.joursRestants ?? 0)} jours`, detail: "Matériel à immobiliser jusqu'au contrôle.", lien: `/app/materiel/${m.id}` });
    else if (e.etat === "expire_bientot") alertes.push({ code: `materiel_bientot_${m.id}`, niveau: "attention", titre: `${m.nom} : ${e.libelle} dans ${e.joursRestants} jours`, lien: `/app/materiel/${m.id}` });
  }

  // Documents de conformité.
  for (const d of documents) {
    const { etat, joursRestants } = etatValidite(d.dateFin, aujourdHui, 30);
    if (etat === "expiree") alertes.push({ code: `document_perime_${d.id}`, niveau: "attention", titre: `${d.nom} périmé`, detail: "À renouveler avant le prochain envoi aux donneurs d'ordre.", lien: "/app/documents" });
    else if (etat === "expire_bientot") alertes.push({ code: `document_bientot_${d.id}`, niveau: "info", titre: `${d.nom} expire dans ${joursRestants} jours`, lien: "/app/documents" });
  }

  // Heures en attente de validation depuis plus de 7 jours.
  const anciens = pointages.filter((p) => p.fin && (p.statut === "saisi" || p.statut === "valide_chef") && dansJours(p.date, aujourdHui) <= -7);
  if (anciens.length > 0) alertes.push({ code: "pointages_en_attente", niveau: "attention", titre: `${anciens.length} pointage${anciens.length > 1 ? "s" : ""} de plus d'une semaine à valider`, detail: "Les variables de paie du mois seront incomplètes.", lien: `/app/heures?semaine=${anciens[0]!.date}` });

  const poids: Record<NiveauAlerte, number> = { urgent: 0, attention: 1, info: 2 };
  return alertes.sort((a, b) => poids[a.niveau] - poids[b.niveau]);
}

/** Charge d'une équipe un jour donné : somme des surfaces prévues des chantiers affectés. */
export function chargeEquipeJour(chantiers: Chantier[], equipeId: string, dateIso: string): number {
  return chantiers.filter((c) => c.equipeId === equipeId && c.dateCoulage === dateIso && !["clos"].includes(c.statut)).reduce((s, c) => s + (c.surfacePrevueM2 ?? c.surfaceCouleeM2 ?? 0), 0);
}
