"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStore } from "@/lib/auth/session";
import { estBureau } from "@/lib/auth/roles";
import { CATALOGUE_HABILITATIONS, MOTIFS_INDISPONIBILITE, TYPES_CONTRAT, dateFinProposee, type Habilitation, type TypeHabilitation } from "@/lib/domain/habilitations";
import type { Membre } from "@/lib/domain/types";

const vide = (v: FormDataEntryValue | null) => (v && String(v).trim() !== "" ? String(v).trim() : undefined);

const schemaMembre = z.object({
  nom: z.string().trim().min(2, "Le nom est requis."),
  email: z.string().trim().email("Adresse e-mail invalide.").or(z.literal("")),
  telephone: z.string().trim().optional(),
  role: z.enum(["gerant", "bureau", "chef_equipe", "applicateur"]),
  equipeId: z.string().optional(),
  typeContrat: z.enum(TYPES_CONTRAT).optional(),
  dateEntree: z.string().optional(),
  cqpNumero: z.string().trim().optional(),
  cqpDate: z.string().optional(),
  notes: z.string().trim().optional(),
  actif: z.string().optional(),
});

function lireMembre(formData: FormData) {
  const brut = Object.fromEntries([...formData.entries()].filter(([, v]) => String(v) !== ""));
  const res = schemaMembre.safeParse({ ...brut, email: brut.email ?? "" });
  if (!res.success) return { erreur: res.error.issues.map((i) => i.message).join(" ") } as const;
  const d = res.data;
  return {
    data: {
      nom: d.nom,
      email: d.email,
      telephone: d.telephone,
      role: d.role,
      equipeId: d.equipeId || undefined,
      typeContrat: d.typeContrat,
      dateEntree: d.dateEntree,
      cqpNumero: d.cqpNumero,
      cqpDate: d.cqpDate,
      notes: d.notes,
      actif: d.actif !== undefined ? d.actif === "on" : true,
    } satisfies Partial<Membre>,
  } as const;
}

export type EtatEquipe = { erreur?: string } | undefined;

export async function creerMembre(_etat: EtatEquipe, formData: FormData): Promise<EtatEquipe> {
  const { session, store } = await getStore();
  if (!estBureau(session)) return { erreur: "Réservé au bureau." };
  const lu = lireMembre(formData);
  if ("erreur" in lu) return { erreur: lu.erreur };
  const m = await store.creerMembre({ ...lu.data, habilitations: [] });
  revalidatePath("/app/equipe");
  redirect(`/app/equipe/${m.id}`);
}

export async function mettreAJourMembre(id: string, _etat: EtatEquipe, formData: FormData): Promise<EtatEquipe> {
  const { session, store } = await getStore();
  if (!estBureau(session)) return { erreur: "Réservé au bureau." };
  const lu = lireMembre(formData);
  if ("erreur" in lu) return { erreur: lu.erreur };
  await store.mettreAJourMembre(id, lu.data);
  revalidatePath("/app/equipe");
  revalidatePath(`/app/equipe/${id}`);
  redirect(`/app/equipe/${id}`);
}

export async function ajouterHabilitation(membreId: string, formData: FormData) {
  const { session, store } = await getStore();
  if (!estBureau(session)) redirect(`/app/equipe/${membreId}`);
  const membre = await store.membre(membreId);
  if (!membre) throw new Error("Membre introuvable.");
  const type = String(formData.get("type")) as TypeHabilitation;
  if (!(type in CATALOGUE_HABILITATIONS)) redirect(`/app/equipe/${membreId}?erreur=Type%20inconnu`);
  const dateObtention = vide(formData.get("dateObtention"));
  const h: Habilitation = {
    id: crypto.randomUUID(),
    type,
    libelle: type === "autre" ? vide(formData.get("libelle")) : undefined,
    numero: vide(formData.get("numero")),
    organisme: vide(formData.get("organisme")),
    dateObtention,
    dateFin: vide(formData.get("dateFin")) ?? (dateObtention ? dateFinProposee(type, dateObtention) : undefined),
  };
  await store.mettreAJourMembre(membreId, { habilitations: [...membre.habilitations, h] });
  revalidatePath(`/app/equipe/${membreId}`);
  revalidatePath("/app/equipe");
  revalidatePath("/app");
  redirect(`/app/equipe/${membreId}#habilitations`);
}

export async function supprimerHabilitation(membreId: string, habilitationId: string) {
  const { session, store } = await getStore();
  if (!estBureau(session)) redirect(`/app/equipe/${membreId}`);
  const membre = await store.membre(membreId);
  if (!membre) throw new Error("Membre introuvable.");
  await store.mettreAJourMembre(membreId, { habilitations: membre.habilitations.filter((h) => h.id !== habilitationId) });
  revalidatePath(`/app/equipe/${membreId}`);
  revalidatePath("/app/equipe");
  redirect(`/app/equipe/${membreId}#habilitations`);
}

export async function ajouterIndisponibilite(membreId: string, formData: FormData) {
  const { session, store } = await getStore();
  const terrainSurSoi = session.membre.id === membreId;
  if (!estBureau(session) && session.membre.role !== "chef_equipe" && !terrainSurSoi) redirect(`/app/equipe/${membreId}`);
  const debut = vide(formData.get("debut"));
  const fin = vide(formData.get("fin")) ?? debut;
  const motif = String(formData.get("motif") ?? "conge") as (typeof MOTIFS_INDISPONIBILITE)[number];
  if (!debut || !fin || fin < debut || !MOTIFS_INDISPONIBILITE.includes(motif)) {
    redirect(`/app/equipe/${membreId}?erreur=${encodeURIComponent("Dates d'indisponibilité invalides.")}#indisponibilites`);
  }
  await store.creerIndisponibilite({ membreId, debut, fin, motif, commentaire: vide(formData.get("commentaire")) });
  revalidatePath(`/app/equipe/${membreId}`);
  revalidatePath("/app/equipe");
  revalidatePath("/app/planning");
  revalidatePath("/app");
  redirect(`/app/equipe/${membreId}#indisponibilites`);
}

export async function supprimerIndisponibilite(membreId: string, id: string) {
  const { session, store } = await getStore();
  if (!estBureau(session) && session.membre.role !== "chef_equipe") redirect(`/app/equipe/${membreId}`);
  await store.supprimerIndisponibilite(id);
  revalidatePath(`/app/equipe/${membreId}`);
  revalidatePath("/app/planning");
  redirect(`/app/equipe/${membreId}#indisponibilites`);
}

export async function enregistrerEquipe(equipeId: string | null, formData: FormData) {
  const { session, store } = await getStore();
  if (!estBureau(session)) redirect("/app/equipe");
  const data = {
    nom: vide(formData.get("nom")) ?? "Équipe",
    couleur: vide(formData.get("couleur")) ?? "#13836d",
    chefId: vide(formData.get("chefId")),
    capaciteM2Jour: Number(formData.get("capaciteM2Jour") ?? 250) || 250,
  };
  const equipe = equipeId ? await store.mettreAJourEquipe(equipeId, data) : await store.creerEquipe(data);
  // Le chef désigné rejoint son équipe.
  if (data.chefId) await store.mettreAJourMembre(data.chefId, { equipeId: equipe.id });
  revalidatePath("/app/equipe");
  revalidatePath("/app/planning");
  redirect("/app/equipe#equipes");
}
