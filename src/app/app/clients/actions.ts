"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStore } from "@/lib/auth/session";

const schemaClient = z.object({
  type: z.enum(["particulier", "professionnel", "collectivite"]),
  nom: z.string().trim().min(2, "Le nom est requis."),
  siren: z.string().trim().optional(),
  email: z.string().trim().email("Adresse e-mail invalide.").or(z.literal("")).optional(),
  telephone: z.string().trim().optional(),
  adresse: z.string().trim().optional(),
  codePostal: z.string().trim().optional(),
  ville: z.string().trim().optional(),
  conditionsPaiementJours: z.coerce.number().int().min(0).max(60),
  notes: z.string().trim().optional(),
});

export type EtatFormulaireClient = { erreur?: string } | undefined;

function lire(formData: FormData) {
  const brut = Object.fromEntries(formData.entries());
  const res = schemaClient.safeParse(brut);
  if (!res.success) return { erreur: res.error.issues.map((i) => i.message).join(" ") } as const;
  const d = res.data;
  // Un professionnel doit avoir un SIREN pour la facture électronique.
  if (d.type !== "particulier" && !d.siren) return { erreur: "Le SIREN est requis pour un client professionnel ou une collectivité (facture électronique)." } as const;
  const vide = (s?: string) => (s && s.length > 0 ? s : undefined);
  return {
    data: {
      type: d.type,
      nom: d.nom,
      siren: vide(d.siren),
      email: vide(d.email),
      telephone: vide(d.telephone),
      adresse: vide(d.adresse),
      codePostal: vide(d.codePostal),
      ville: vide(d.ville),
      conditionsPaiementJours: d.conditionsPaiementJours,
      notes: vide(d.notes),
    },
  } as const;
}

export async function creerClient(_etat: EtatFormulaireClient, formData: FormData): Promise<EtatFormulaireClient> {
  const lu = lire(formData);
  if ("erreur" in lu) return { erreur: lu.erreur };
  const { store } = await getStore();
  const client = await store.creerClient(lu.data);
  revalidatePath("/app/clients");
  const suite = String(formData.get("suite") ?? "");
  redirect(suite.startsWith("/app/devis/nouveau") ? `${suite}?client=${client.id}` : `/app/clients/${client.id}`);
}

export async function mettreAJourClient(id: string, _etat: EtatFormulaireClient, formData: FormData): Promise<EtatFormulaireClient> {
  const lu = lire(formData);
  if ("erreur" in lu) return { erreur: lu.erreur };
  const { store } = await getStore();
  await store.mettreAJourClient(id, lu.data);
  revalidatePath("/app/clients");
  revalidatePath(`/app/clients/${id}`);
  redirect(`/app/clients/${id}`);
}
