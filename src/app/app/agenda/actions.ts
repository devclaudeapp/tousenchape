"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/auth/session";
import { estBureau } from "@/lib/auth/roles";
import type { TypeRendezVous } from "@/lib/domain/types";

const vide = (v: FormDataEntryValue | null) => (v && String(v).trim() !== "" ? String(v).trim() : undefined);

export async function creerRendezVous(formData: FormData) {
  const { session, store } = await getStore();
  if (!estBureau(session)) redirect("/app/agenda");
  const date = vide(formData.get("date"));
  const heure = vide(formData.get("heure"));
  if (!date || !heure) redirect(`/app/agenda?erreur=${encodeURIComponent("Date et heure requises.")}`);
  await store.creerRendezVous({
    type: (vide(formData.get("type")) ?? "autre") as TypeRendezVous,
    date,
    heure,
    dureeMin: Number(formData.get("dureeMin") ?? 60) || 60,
    chantierId: vide(formData.get("chantierId")),
    clientId: vide(formData.get("clientId")),
    membreId: vide(formData.get("membreId")),
    adresse: vide(formData.get("adresse")),
    notes: vide(formData.get("notes")),
  });
  revalidatePath("/app/agenda");
  redirect("/app/agenda");
}

export async function supprimerRendezVous(id: string) {
  const { session, store } = await getStore();
  if (!estBureau(session)) redirect("/app/agenda");
  await store.supprimerRendezVous(id);
  revalidatePath("/app/agenda");
  redirect("/app/agenda");
}

export async function marquerRappelEnvoye(id: string) {
  const { session, store } = await getStore();
  if (!estBureau(session)) redirect("/app/agenda");
  await store.mettreAJourRendezVous(id, { rappelEnvoyeLe: new Date().toISOString() });
  revalidatePath("/app/agenda");
  redirect("/app/agenda");
}
