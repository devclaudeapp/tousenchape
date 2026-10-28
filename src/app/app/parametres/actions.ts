"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/auth/session";
import type { GrilleTarifaire } from "@/lib/chape/devis";

const texte = (fd: FormData, cle: string) => {
  const v = fd.get(cle);
  return v === null ? undefined : String(v).trim() || undefined;
};
const nombre = (fd: FormData, cle: string, defaut: number) => {
  const v = Number(fd.get(cle));
  return Number.isFinite(v) && String(fd.get(cle) ?? "") !== "" ? v : defaut;
};

export async function enregistrerEntreprise(formData: FormData) {
  const { session, store } = await getStore();
  if (session.membre.role !== "gerant") redirect("/app/parametres");
  await store.mettreAJourEntreprise({
    nom: texte(formData, "nom") ?? session.entreprise.nom,
    siren: texte(formData, "siren") ?? "",
    tvaIntracom: texte(formData, "tvaIntracom"),
    telephone: texte(formData, "telephone"),
    email: texte(formData, "email"),
    adresse: texte(formData, "adresse") ?? "",
    codePostal: texte(formData, "codePostal") ?? "",
    ville: texte(formData, "ville") ?? "",
    assureurDecennale: texte(formData, "assureurDecennale"),
    numeroContratDecennale: texte(formData, "numeroContratDecennale"),
    zoneCouvertureDecennale: texte(formData, "zoneCouvertureDecennale"),
    attestationDecennaleExpireLe: texte(formData, "attestationDecennaleExpireLe"),
    mediateurConsommation: texte(formData, "mediateurConsommation"),
  });
  revalidatePath("/app", "layout");
  redirect("/app/parametres?ok=1");
}

export async function enregistrerGrille(formData: FormData) {
  const { session, store } = await getStore();
  if (session.membre.role !== "gerant") redirect("/app/parametres");
  const g = session.entreprise.grilleTarifaire;
  const grille: GrilleTarifaire = {
    prixMortierM3: nombre(formData, "prixMortierM3", g.prixMortierM3),
    coefficientMortier: nombre(formData, "coefficientMortier", g.coefficientMortier),
    mainOeuvreParTranche: g.mainOeuvreParTranche.map((t, i) => ({ ...t, prixM2: nombre(formData, `tranche_${i}`, t.prixM2) })),
    forfaitPompeJour: nombre(formData, "forfaitPompeJour", g.forfaitPompeJour),
    prixKmSupplementaire: nombre(formData, "prixKmSupplementaire", g.prixKmSupplementaire),
    franchiseKm: nombre(formData, "franchiseKm", g.franchiseKm),
    plusValuePompageDifficile: nombre(formData, "plusValuePompageDifficile", g.plusValuePompageDifficile),
    prixFilmM2: nombre(formData, "prixFilmM2", g.prixFilmM2),
    prixBandeMl: nombre(formData, "prixBandeMl", g.prixBandeMl),
    prixPoncageM2: nombre(formData, "prixPoncageM2", g.prixPoncageM2),
    prixPrimaireM2: nombre(formData, "prixPrimaireM2", g.prixPrimaireM2),
    prixIsolantM2: { SC1: nombre(formData, "prixIsolantSC1", g.prixIsolantM2.SC1), SC2: nombre(formData, "prixIsolantSC2", g.prixIsolantM2.SC2) },
    prixMesureCM: nombre(formData, "prixMesureCM", g.prixMesureCM),
    minimumFacturation: nombre(formData, "minimumFacturation", g.minimumFacturation),
    forfaitDechets: nombre(formData, "forfaitDechets", g.forfaitDechets),
  };
  await store.mettreAJourEntreprise({ grilleTarifaire: grille, tauxPertes: nombre(formData, "tauxPertes", session.entreprise.tauxPertes * 100) / 100 });
  revalidatePath("/app", "layout");
  redirect("/app/parametres?ok=1");
}
