"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/auth/session";
import { estBureau } from "@/lib/auth/roles";

const TAILLE_MAX_PHOTO = 1_500_000; // ~1,1 Mo de JPEG une fois décodé le base64

export async function publierMessage(chantierId: string, formData: FormData) {
  const { session, store } = await getStore();
  const texte = String(formData.get("texte") ?? "").trim();
  const photo = String(formData.get("photo") ?? "");
  const signalement = formData.get("signalement") === "on";
  if (!texte && !photo) redirect(`/app/chantiers/${chantierId}#fil`);
  if (photo && (!photo.startsWith("data:image/jpeg;base64,") || photo.length > TAILLE_MAX_PHOTO)) {
    redirect(`/app/chantiers/${chantierId}?erreur=${encodeURIComponent("Photo refusée : format ou taille invalide.")}#fil`);
  }
  const photoUrl = photo ? await store.enregistrerPhoto(photo, chantierId) : undefined;
  await store.creerMessage({ chantierId, auteurId: session.membre.id, texte: texte || "Photo", photoUrl, signalement });
  revalidatePath(`/app/chantiers/${chantierId}`);
  revalidatePath("/app");
  revalidatePath("/app/ma-journee");
  redirect(`/app/chantiers/${chantierId}#fil`);
}

export async function traiterSignalement(chantierId: string, messageId: string) {
  const { session, store } = await getStore();
  if (!estBureau(session)) redirect(`/app/chantiers/${chantierId}#fil`);
  await store.mettreAJourMessage(messageId, { traiteLe: new Date().toISOString() });
  revalidatePath(`/app/chantiers/${chantierId}`);
  revalidatePath("/app");
  redirect(`/app/chantiers/${chantierId}#fil`);
}
