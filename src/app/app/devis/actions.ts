"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/auth/session";
import type { Devis } from "@/lib/domain/types";
import { chiffrerDevisEnregistre } from "@/lib/domain/chiffrage";
import { schemaDevis } from "@/lib/domain/schema-devis";

export type EtatDevis = { erreur?: string } | undefined;

export async function enregistrerDevis(devisId: string | null, _etat: EtatDevis, formData: FormData): Promise<EtatDevis> {
  let brut: unknown;
  try {
    brut = JSON.parse(String(formData.get("donnees") ?? "{}"));
  } catch {
    return { erreur: "Données du formulaire illisibles." };
  }
  const res = schemaDevis.safeParse(brut);
  if (!res.success) return { erreur: res.error.issues.map((i) => i.message).join(" ") };

  const { store } = await getStore();
  if (devisId) {
    const existant = await store.devis(devisId);
    if (!existant) return { erreur: "Devis introuvable." };
    if (existant.statut !== "brouillon") return { erreur: "Un devis envoyé ne se modifie plus : créez une nouvelle version." };
    await store.mettreAJourDevis(devisId, res.data);
    revalidatePath(`/app/devis/${devisId}`);
    revalidatePath("/app/devis");
    redirect(`/app/devis/${devisId}`);
  }
  const d = await store.creerDevis({ ...res.data, statut: "brouillon" });
  revalidatePath("/app/devis");
  redirect(`/app/devis/${d.id}`);
}

export async function changerStatutDevis(devisId: string, statut: Devis["statut"], formData?: FormData) {
  const { session, store } = await getStore();
  const devis = await store.devis(devisId);
  if (!devis) throw new Error("Devis introuvable.");

  if (statut === "envoye") {
    const produit = devis.produitId ? await store.produit(devis.produitId) : null;
    const r = chiffrerDevisEnregistre(devis, session.entreprise, produit);
    if (r.alertes.some((a) => a.severite === "bloquant")) {
      redirect(`/app/devis/${devisId}?erreur=${encodeURIComponent("Le devis comporte une épaisseur sous le minimum des Règles professionnelles : corrigez-la avant l'envoi.")}`);
    }
    await store.mettreAJourDevis(devisId, { statut, envoyeLe: new Date().toISOString() });
  } else if (statut === "signe") {
    const signatureNom = String(formData?.get("signatureNom") ?? "").trim() || undefined;
    await store.mettreAJourDevis(devisId, { statut, signeLe: new Date().toISOString(), signatureNom });
    // Un devis signé devient un chantier.
    const chantier = await store.creerChantier({
      devisId,
      clientId: devis.clientId,
      produitId: devis.produitId,
      statut: "planifie",
      adresse: devis.adresseChantier,
      codePostal: devis.codePostalChantier,
      ville: devis.villeChantier,
      classementUPEC: devis.configuration.classeLocal,
      surfacePrevueM2: devis.pieces.reduce((s, p) => s + p.surfaceM2, 0),
      notes: devis.objet,
    });
    revalidatePath("/app/chantiers");
    revalidatePath(`/app/devis/${devisId}`);
    redirect(`/app/chantiers/${chantier.id}`);
  } else {
    await store.mettreAJourDevis(devisId, { statut });
  }
  revalidatePath(`/app/devis/${devisId}`);
  revalidatePath("/app/devis");
  redirect(`/app/devis/${devisId}`);
}

/** Nouvelle version d'un devis envoyé ou refusé : copie en brouillon, numéro conservé, version + 1. */
export async function nouvelleVersionDevis(devisId: string) {
  const { store } = await getStore();
  const devis = await store.devis(devisId);
  if (!devis) throw new Error("Devis introuvable.");
  const { id: _id, numero, version, statut: _s, envoyeLe: _e, signeLe: _si, signatureNom: _sn, createdAt: _c, updatedAt: _u, entrepriseId: _ent, ...reste } = devis;
  void _id; void _s; void _e; void _si; void _sn; void _c; void _u; void _ent;
  const copie = await store.creerDevis({ ...reste, statut: "brouillon" });
  // Le magasin attribue un nouveau numéro ; on reprend celui d'origine avec la version suivante.
  await store.mettreAJourDevis(copie.id, { numero, version: version + 1 });
  revalidatePath("/app/devis");
  redirect(`/app/devis/${copie.id}?modifier=1`);
}
