"use server";

import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/auth/session";
import { estBureau } from "@/lib/auth/roles";
import { indisponibleLe } from "@/lib/domain/alertes";

export interface ResultatDeplacement {
  ok: boolean;
  message?: string;
}

/** Déplace un chantier vers une date et une équipe (glisser-déposer du planning). */
export async function deplacerChantier(chantierId: string, dateIso: string, equipeId: string | null): Promise<ResultatDeplacement> {
  const { session, store } = await getStore();
  if (!estBureau(session) && session.membre.role !== "chef_equipe") return { ok: false, message: "Réservé au bureau et aux chefs d'équipe." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return { ok: false, message: "Date invalide." };

  const chantier = await store.chantier(chantierId);
  if (!chantier) return { ok: false, message: "Chantier introuvable." };
  if (["coule", "sechage", "reception", "facture", "clos"].includes(chantier.statut)) {
    return { ok: false, message: "Un chantier déjà coulé ne se déplace plus." };
  }

  const [equipes, membres, indispos] = await Promise.all([store.equipes(), store.membres(), store.indisponibilites()]);
  const equipe = equipeId ? equipes.find((e) => e.id === equipeId) : undefined;
  const chef = equipe ? membres.find((m) => m.id === equipe.chefId) : membres.find((m) => m.id === chantier.chefEquipeId);

  if (equipe && chef && !chef.cqpNumero) {
    return { ok: false, message: `${equipe.nom} : ${chef.nom} n'a pas le CQP chapiste, le coulage ne peut pas lui être confié.` };
  }

  let avertissement: string | undefined;
  if (chef) {
    const absence = indisponibleLe(indispos, chef.id, dateIso);
    if (absence) avertissement = `${chef.nom} est absent ce jour-là (${absence.motif}) : prévoyez un remplaçant.`;
  }
  if (equipe) {
    const dateObj = new Date(`${dateIso}T00:00:00`);
    if (dateObj.getDay() === 0) avertissement = (avertissement ? avertissement + " " : "") + "Coulage un dimanche.";
  }

  await store.mettreAJourChantier(chantierId, {
    dateCoulage: dateIso,
    equipeId: equipe?.id,
    chefEquipeId: equipe ? equipe.chefId : chantier.chefEquipeId,
    statut: chantier.statut === "pret" && dateIso !== chantier.dateCoulage ? "pret" : chantier.statut,
  });
  revalidatePath("/app/planning");
  revalidatePath("/app/chantiers");
  revalidatePath(`/app/chantiers/${chantierId}`);
  revalidatePath("/app");
  revalidatePath("/app/ma-journee");
  return { ok: true, message: avertissement };
}
