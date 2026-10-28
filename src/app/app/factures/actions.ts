"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/auth/session";

export async function enregistrerPaiement(factureId: string, formData: FormData) {
  const montant = Number(formData.get("montant") ?? 0);
  if (!(montant > 0)) redirect("/app/factures");
  const { store } = await getStore();
  const f = await store.facture(factureId);
  if (!f) throw new Error("Facture introuvable.");
  const paiements = [...f.paiements, { id: `nouveau-${Date.now()}`, montant, datePaiement: new Date().toISOString().slice(0, 10), moyen: String(formData.get("moyen") ?? "Virement") }];
  const total = paiements.reduce((s, p) => s + p.montant, 0);
  await store.mettreAJourFacture(factureId, { paiements, statut: total >= f.totalTTC - 0.005 ? "payee" : f.statut });
  revalidatePath("/app/factures");
  revalidatePath("/app");
  redirect("/app/factures");
}
