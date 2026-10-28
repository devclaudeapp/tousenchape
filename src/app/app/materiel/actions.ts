"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/auth/session";
import { estBureau } from "@/lib/auth/roles";
import type { ControleMateriel, Materiel, TypeControleMateriel, TypeMateriel } from "@/lib/domain/types";
import { PERIODICITE_MOIS } from "@/lib/domain/materiel";

const vide = (v: FormDataEntryValue | null) => (v && String(v).trim() !== "" ? String(v).trim() : undefined);
const TYPES: TypeMateriel[] = ["pompe", "malaxeur", "camion", "laser", "bombe_cm", "autre"];
const TYPES_CONTROLE: TypeControleMateriel[] = ["vgp", "entretien", "controle_technique", "etalonnage", "autre"];

function rafraichir(id?: string) {
  revalidatePath("/app/materiel");
  revalidatePath("/app");
  if (id) revalidatePath(`/app/materiel/${id}`);
}

export async function enregistrerMateriel(materielId: string | null, formData: FormData) {
  const { session, store } = await getStore();
  if (!estBureau(session) && session.membre.role !== "chef_equipe") redirect("/app/materiel");
  const type = (vide(formData.get("type")) ?? "autre") as TypeMateriel;
  const data: Omit<Materiel, "id" | "entrepriseId" | "controles"> = {
    type: TYPES.includes(type) ? type : "autre",
    nom: vide(formData.get("nom")) ?? "Matériel",
    immatriculation: vide(formData.get("immatriculation")),
    numeroSerie: vide(formData.get("numeroSerie")),
    dateAchat: vide(formData.get("dateAchat")),
    equipeId: vide(formData.get("equipeId")),
    actif: formData.get("actif") !== "off" && formData.get("actif") !== null ? formData.get("actif") === "on" || materielId === null : materielId === null,
    notes: vide(formData.get("notes")),
  };
  if (materielId) {
    await store.mettreAJourMateriel(materielId, { ...data, actif: formData.get("actif") === "on" });
    rafraichir(materielId);
    redirect(`/app/materiel/${materielId}`);
  }
  const m = await store.creerMateriel({ ...data, actif: true, controles: [] });
  rafraichir();
  redirect(`/app/materiel/${m.id}`);
}

export async function ajouterControle(materielId: string, formData: FormData) {
  const { session, store } = await getStore();
  if (!estBureau(session) && session.membre.role !== "chef_equipe") redirect(`/app/materiel/${materielId}`);
  const materiel = (await store.materiels()).find((m) => m.id === materielId);
  if (!materiel) throw new Error("Matériel introuvable.");
  const type = (vide(formData.get("type")) ?? "autre") as TypeControleMateriel;
  const dateFait = vide(formData.get("dateFait"));
  let prochaineDate = vide(formData.get("prochaineDate"));
  if (!prochaineDate && dateFait) {
    const d = new Date(`${dateFait}T00:00:00`);
    d.setMonth(d.getMonth() + PERIODICITE_MOIS[TYPES_CONTROLE.includes(type) ? type : "autre"]);
    prochaineDate = d.toISOString().slice(0, 10);
  }
  const c: ControleMateriel = { id: crypto.randomUUID(), type: TYPES_CONTROLE.includes(type) ? type : "autre", libelle: vide(formData.get("libelle")), dateFait, prochaineDate, commentaire: vide(formData.get("commentaire")) };
  await store.mettreAJourMateriel(materielId, { controles: [...materiel.controles, c] });
  rafraichir(materielId);
  redirect(`/app/materiel/${materielId}#controles`);
}

export async function supprimerControle(materielId: string, controleId: string) {
  const { session, store } = await getStore();
  if (!estBureau(session)) redirect(`/app/materiel/${materielId}`);
  const materiel = (await store.materiels()).find((m) => m.id === materielId);
  if (!materiel) throw new Error("Matériel introuvable.");
  await store.mettreAJourMateriel(materielId, { controles: materiel.controles.filter((c) => c.id !== controleId) });
  rafraichir(materielId);
  redirect(`/app/materiel/${materielId}#controles`);
}
