"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/auth/session";
import { estBureau } from "@/lib/auth/roles";
import type { TypeDocumentEntreprise } from "@/lib/domain/types";

const vide = (v: FormDataEntryValue | null) => (v && String(v).trim() !== "" ? String(v).trim() : undefined);

export async function creerDocument(formData: FormData) {
  const { session, store } = await getStore();
  if (!estBureau(session)) redirect("/app/documents");
  await store.creerDocument({
    type: (vide(formData.get("type")) ?? "autre") as TypeDocumentEntreprise,
    nom: vide(formData.get("nom")) ?? "Document",
    dateFin: vide(formData.get("dateFin")),
    url: vide(formData.get("url")),
  });
  revalidatePath("/app/documents");
  revalidatePath("/app");
  redirect("/app/documents");
}

export async function supprimerDocument(id: string) {
  const { session, store } = await getStore();
  if (!estBureau(session)) redirect("/app/documents");
  await store.supprimerDocument(id);
  revalidatePath("/app/documents");
  revalidatePath("/app");
  redirect("/app/documents");
}
