"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/auth/session";
import { estBureau } from "@/lib/auth/roles";
import { distanceKm, zoneDepuisDistance } from "@/lib/domain/heures";
import type { Pointage } from "@/lib/domain/types";

const vide = (v: FormDataEntryValue | null) => (v && String(v).trim() !== "" ? String(v).trim() : undefined);
const nombre = (v: FormDataEntryValue | null) => (vide(v) !== undefined && Number.isFinite(Number(v)) ? Number(v) : undefined);
const jourLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

function rafraichir(chantierId?: string) {
  revalidatePath("/app/ma-journee");
  revalidatePath("/app/heures");
  revalidatePath("/app/heures/paie");
  revalidatePath("/app/rentabilite");
  revalidatePath("/app");
  if (chantierId) revalidatePath(`/app/chantiers/${chantierId}`);
}

/** Pointage depuis Ma journée : arrivée (ouvre la journée) ou départ (clôt le pointage ouvert). */
export async function pointer(formData: FormData) {
  const { session, store } = await getStore();
  const mode = String(formData.get("mode"));
  const lat = nombre(formData.get("lat"));
  const lng = nombre(formData.get("lng"));
  const maintenant = new Date();

  if (mode === "arrivee") {
    const ouvert = (await store.pointages({ membreId: session.membre.id })).find((p) => !p.fin);
    if (ouvert) redirect("/app/ma-journee?erreur=" + encodeURIComponent("Un pointage est déjà en cours : pointez d'abord votre départ."));
    const chantierId = vide(formData.get("chantierId"));
    const chantier = chantierId ? await store.chantier(chantierId) : null;
    const entreprise = session.entreprise;

    // Zone de petit déplacement : distance du dépôt au chantier (ou à la position pointée).
    let zone: number | null = null;
    let ecart: number | undefined;
    if (entreprise.depotLat !== undefined && entreprise.depotLng !== undefined) {
      const depot = { lat: entreprise.depotLat, lng: entreprise.depotLng };
      if (chantier?.latitude !== undefined && chantier?.longitude !== undefined) zone = zoneDepuisDistance(distanceKm(depot, { lat: chantier.latitude, lng: chantier.longitude }));
      else if (lat !== undefined && lng !== undefined) zone = zoneDepuisDistance(distanceKm(depot, { lat, lng }));
    }
    if (chantier?.latitude !== undefined && chantier?.longitude !== undefined && lat !== undefined && lng !== undefined) {
      ecart = distanceKm({ lat, lng }, { lat: chantier.latitude, lng: chantier.longitude });
    }

    await store.creerPointage({
      membreId: session.membre.id,
      chantierId,
      date: jourLocal(maintenant),
      debut: maintenant.toISOString(),
      pauseMin: 0,
      type: chantierId ? "chantier" : "depot",
      zoneTrajet: chantierId ? zone : null,
      panier: Boolean(chantierId),
      grandDeplacement: false,
      statut: "saisi",
      latDebut: lat,
      lngDebut: lng,
      ecartChantierKm: ecart,
    });
    rafraichir(chantierId);
    redirect("/app/ma-journee");
  }

  if (mode === "depart") {
    const ouvert = (await store.pointages({ membreId: session.membre.id })).find((p) => !p.fin);
    if (!ouvert) redirect("/app/ma-journee?erreur=" + encodeURIComponent("Aucun pointage en cours."));
    await store.mettreAJourPointage(ouvert.id, {
      fin: maintenant.toISOString(),
      pauseMin: nombre(formData.get("pauseMin")) ?? 45,
      panier: formData.get("panier") === "on",
      grandDeplacement: formData.get("grandDeplacement") === "on",
      latFin: lat,
      lngFin: lng,
      commentaire: vide(formData.get("commentaire")),
    });
    rafraichir(ouvert.chantierId);
    redirect("/app/ma-journee");
  }
  redirect("/app/ma-journee");
}

/** Saisie manuelle par le bureau ou le chef (oubli, correction). */
export async function ajouterPointage(formData: FormData) {
  const { session, store } = await getStore();
  if (!estBureau(session) && session.membre.role !== "chef_equipe") redirect("/app/heures");
  const membreId = vide(formData.get("membreId"));
  const date = vide(formData.get("date"));
  const debut = vide(formData.get("debut"));
  const fin = vide(formData.get("fin"));
  if (!membreId || !date || !debut) redirect(`/app/heures?erreur=${encodeURIComponent("Compagnon, date et heure de début sont requis.")}`);
  const type = (vide(formData.get("type")) ?? "chantier") as Pointage["type"];
  const zone = nombre(formData.get("zoneTrajet"));
  await store.creerPointage({
    membreId,
    chantierId: vide(formData.get("chantierId")),
    date,
    debut: new Date(`${date}T${debut}:00`).toISOString(),
    fin: fin ? new Date(`${date}T${fin}:00`).toISOString() : undefined,
    pauseMin: nombre(formData.get("pauseMin")) ?? 45,
    type,
    zoneTrajet: zone && zone >= 1 && zone <= 5 ? zone : null,
    panier: formData.get("panier") === "on",
    grandDeplacement: formData.get("grandDeplacement") === "on",
    statut: estBureau(session) ? "valide_bureau" : "valide_chef",
    commentaire: vide(formData.get("commentaire")),
    valideChefId: session.membre.role === "chef_equipe" ? session.membre.id : undefined,
    valideBureauId: estBureau(session) ? session.membre.id : undefined,
  });
  rafraichir();
  redirect(`/app/heures?semaine=${date}`);
}

export async function changerStatutPointage(pointageId: string, statut: Pointage["statut"], formData?: FormData) {
  const { session, store } = await getStore();
  const p = await store.pointage(pointageId);
  if (!p) throw new Error("Pointage introuvable.");
  const bureau = estBureau(session);
  const chef = session.membre.role === "chef_equipe";
  if (statut === "valide_bureau" && !bureau) redirect("/app/heures");
  if (statut === "valide_chef" && !bureau && !chef) redirect("/app/heures");
  if (statut === "refuse" && !bureau && !chef) redirect("/app/heures");

  const patch: Partial<Pointage> = { statut };
  if (statut === "valide_chef") patch.valideChefId = session.membre.id;
  if (statut === "valide_bureau") patch.valideBureauId = session.membre.id;
  const motif = formData ? vide(formData.get("motif")) : undefined;
  if (statut === "refuse" && motif) patch.commentaire = `${p.commentaire ? p.commentaire + " — " : ""}Refusé : ${motif}`;
  await store.mettreAJourPointage(pointageId, patch);
  rafraichir(p.chantierId);
  redirect(`/app/heures?semaine=${p.date}`);
}

/** Correction des heures d'un pointage non encore validé par le bureau (ou par le bureau lui-même). */
export async function corrigerPointage(pointageId: string, formData: FormData) {
  const { session, store } = await getStore();
  const p = await store.pointage(pointageId);
  if (!p) throw new Error("Pointage introuvable.");
  const bureau = estBureau(session);
  if (!bureau && !(session.membre.role === "chef_equipe" && p.statut !== "valide_bureau") && !(p.membreId === session.membre.id && p.statut === "saisi")) redirect("/app/heures");
  const debut = vide(formData.get("debut"));
  const fin = vide(formData.get("fin"));
  await store.mettreAJourPointage(pointageId, {
    debut: debut ? new Date(`${p.date}T${debut}:00`).toISOString() : p.debut,
    fin: fin ? new Date(`${p.date}T${fin}:00`).toISOString() : p.fin,
    pauseMin: nombre(formData.get("pauseMin")) ?? p.pauseMin,
    panier: formData.get("panier") === "on",
    zoneTrajet: (() => {
      const z = nombre(formData.get("zoneTrajet"));
      return z && z >= 1 && z <= 5 ? z : null;
    })(),
    chantierId: vide(formData.get("chantierId")) ?? p.chantierId,
    // Toute correction par un chef remet le pointage en attente du bureau.
    statut: bureau ? p.statut : "valide_chef",
  });
  rafraichir(p.chantierId);
  redirect(`/app/heures?semaine=${p.date}`);
}

/** Validation groupée d'une semaine par le bureau. */
export async function validerSemaineBureau(semaine: string, membreIds: string[]) {
  const { session, store } = await getStore();
  if (!estBureau(session)) redirect("/app/heures");
  const fin = new Date(`${semaine}T00:00:00`);
  fin.setDate(fin.getDate() + 6);
  const pointages = await store.pointages({ depuis: semaine, jusqua: fin.toISOString().slice(0, 10) });
  for (const p of pointages) {
    if (membreIds.includes(p.membreId) && (p.statut === "saisi" || p.statut === "valide_chef") && p.fin) {
      await store.mettreAJourPointage(p.id, { statut: "valide_bureau", valideBureauId: session.membre.id });
    }
  }
  rafraichir();
  redirect(`/app/heures?semaine=${semaine}`);
}
