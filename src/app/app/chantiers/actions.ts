"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStore } from "@/lib/auth/session";
import { controlerLivraison } from "@/lib/chape/livraison";
import { determinerRegimeTVA } from "@/lib/chape/tva";
import { chiffrerDevisEnregistre } from "@/lib/domain/chiffrage";
import { VISITE_TECHNIQUE } from "@/lib/domain/checklists";
import type { Chantier, Controle, Facture, StatutChantier } from "@/lib/domain/types";

const vide = (s: FormDataEntryValue | null) => (s && String(s).trim().length > 0 ? String(s).trim() : undefined);
const nombre = (s: FormDataEntryValue | null) => (vide(s) !== undefined ? Number(s) : undefined);

export async function planifierChantier(chantierId: string, formData: FormData) {
  const { store } = await getStore();
  const membres = await store.membres();
  const chefEquipeId = vide(formData.get("chefEquipeId"));
  const chef = membres.find((m) => m.id === chefEquipeId);
  const dateCoulage = vide(formData.get("dateCoulage"));

  // Règle CQP : un coulage ne se planifie qu'avec un chef d'équipe titulaire du CQP chapiste (obligatoire depuis le 1er août 2024).
  if (dateCoulage && chef && !chef.cqpNumero) {
    redirect(`/app/chantiers/${chantierId}?erreur=${encodeURIComponent(`${chef.nom} n'est pas titulaire du CQP chef d'équipe chapiste : le coulage ne peut pas être planifié avec cette équipe.`)}`);
  }

  const patch: Partial<Chantier> = {
    dateCoulage,
    heurePremierCamion: vide(formData.get("heurePremierCamion")),
    chefEquipeId,
    centraleId: vide(formData.get("centraleId")),
    produitId: vide(formData.get("produitId")),
    accesCamion: vide(formData.get("accesCamion")),
    distancePompageM: nombre(formData.get("distancePompageM")),
    etage: nombre(formData.get("etage")),
    natureSupport: vide(formData.get("natureSupport")),
  };
  await store.mettreAJourChantier(chantierId, patch);
  revalidatePath(`/app/chantiers/${chantierId}`);
  revalidatePath("/app/chantiers");
  revalidatePath("/app/planning");
  redirect(`/app/chantiers/${chantierId}`);
}

export async function changerStatutChantier(chantierId: string, statut: StatutChantier, formData?: FormData) {
  const { store } = await getStore();
  const chantier = await store.chantier(chantierId);
  if (!chantier) throw new Error("Chantier introuvable.");

  if (statut === "pret") {
    const controles = await store.controles(chantierId);
    const visite = controles.filter((c) => c.type === "visite_technique").at(-1);
    if (!visite || !visite.conforme) {
      redirect(`/app/chantiers/${chantierId}?erreur=${encodeURIComponent("La visite technique doit être enregistrée et conforme avant de passer le chantier « Prêt à couler ».")}`);
    }
  }

  const patch: Partial<Chantier> = { statut };
  if (statut === "coule") {
    patch.heureDebutCoulage = vide(formData?.get("heureDebutCoulage") ?? null) ?? new Date().toISOString();
    patch.heureFinCoulage = vide(formData?.get("heureFinCoulage") ?? null);
    patch.surfaceCouleeM2 = nombre(formData?.get("surfaceCouleeM2") ?? null);
    patch.temperatureC = nombre(formData?.get("temperatureC") ?? null);
    if (!chantier.dateCoulage) patch.dateCoulage = new Date().toISOString().slice(0, 10);
  }
  if (statut === "planifie") patch.motifReport = vide(formData?.get("motifReport") ?? null);

  await store.mettreAJourChantier(chantierId, patch);
  revalidatePath(`/app/chantiers/${chantierId}`);
  revalidatePath("/app/chantiers");
  redirect(`/app/chantiers/${chantierId}`);
}

const schemaLivraison = z.object({
  numeroBon: z.string().trim().min(1, "Le numéro de bon est requis."),
  uniteProduction: z.string().trim().optional(),
  volumeM3: z.coerce.number().positive("Le volume doit être positif."),
  etalementDepartCm: z.coerce.number().positive().optional(),
  etalementChantierCm: z.coerce.number().positive("L'étalement sur chantier est requis."),
  eauAjouteeLParM3: z.coerce.number().min(0).default(0),
  heureFabrication: z.string().optional(),
  heureArrivee: z.string().optional(),
  heureFinDechargement: z.string().optional(),
});

export async function ajouterLivraison(chantierId: string, formData: FormData) {
  const { session, store } = await getStore();
  const chantier = await store.chantier(chantierId);
  if (!chantier) throw new Error("Chantier introuvable.");
  const brut = Object.fromEntries([...formData.entries()].filter(([, v]) => String(v).trim() !== ""));
  const res = schemaLivraison.safeParse(brut);
  if (!res.success) redirect(`/app/chantiers/${chantierId}?erreur=${encodeURIComponent(res.error.issues.map((i) => i.message).join(" "))}`);
  const d = res.data;
  const produit = chantier.produitId ? await store.produit(chantier.produitId) : null;

  // Les heures sont saisies en heure locale pour la date du coulage.
  const jour = chantier.dateCoulage ?? new Date().toISOString().slice(0, 10);
  const horodate = (h?: string) => (h ? new Date(`${jour}T${h}:00`) : undefined);
  const iso = (h?: string) => horodate(h)?.toISOString();

  const alertes = produit
    ? controlerLivraison(
        {
          etalementDepartCm: d.etalementDepartCm,
          etalementChantierCm: d.etalementChantierCm,
          eauAjouteeLParM3: d.eauAjouteeLParM3,
          heureFabrication: horodate(d.heureFabrication),
          heureArrivee: horodate(d.heureArrivee),
          heureFinDechargement: horodate(d.heureFinDechargement),
        },
        produit,
      )
    : [];

  await store.ajouterLivraison({
    chantierId,
    numeroBon: d.numeroBon,
    uniteProduction: d.uniteProduction,
    volumeM3: d.volumeM3,
    etalementDepartCm: d.etalementDepartCm,
    etalementChantierCm: d.etalementChantierCm,
    eauAjouteeLParM3: d.eauAjouteeLParM3,
    heureFabrication: iso(d.heureFabrication),
    heureArrivee: iso(d.heureArrivee),
    heureFinDechargement: iso(d.heureFinDechargement),
    alertes,
    signeParId: session.membre.id,
  });
  revalidatePath(`/app/chantiers/${chantierId}`);
  redirect(`/app/chantiers/${chantierId}#livraisons`);
}

export async function enregistrerVisiteTechnique(chantierId: string, formData: FormData) {
  const { session, store } = await getStore();
  const reponses: Controle["reponses"] = {};
  for (const point of VISITE_TECHNIQUE) {
    const v = formData.get(`point_${point.cle}`);
    reponses[point.cle] = v === "oui" || v === "non" || v === "na" ? v : "na";
  }
  const temperature = nombre(formData.get("temperatureC"));
  const mesures: Controle["mesures"] = [];
  if (temperature !== undefined) mesures.push({ type: "temperature", valeur: temperature, unite: "°C", conforme: temperature >= 5 && temperature <= 30 });
  const conforme = VISITE_TECHNIQUE.every((p) => !p.bloquant || reponses[p.cle] !== "non") && mesures.every((m) => m.conforme);

  await store.ajouterControle({ chantierId, type: "visite_technique", reponses, mesures, conforme, auteurId: session.membre.id, commentaire: vide(formData.get("commentaire")) });
  const patch: Partial<Chantier> = { statut: conforme ? "pret" : "preparation" };
  if (temperature !== undefined) patch.temperatureC = temperature;
  await store.mettreAJourChantier(chantierId, patch);
  revalidatePath(`/app/chantiers/${chantierId}`);
  redirect(`/app/chantiers/${chantierId}#controles`);
}

/** Facture d'acompte (pourcentage du devis) ou de solde (devis moins acomptes déjà facturés). */
export async function creerFactureChantier(chantierId: string, type: "acompte" | "solde", formData: FormData) {
  const { session, store } = await getStore();
  const chantier = await store.chantier(chantierId);
  if (!chantier?.devisId) throw new Error("Ce chantier n'est pas lié à un devis.");
  const devis = await store.devis(chantier.devisId);
  const client = await store.client(chantier.clientId);
  if (!devis || !client) throw new Error("Devis ou client introuvable.");
  const produit = devis.produitId ? await store.produit(devis.produitId) : null;
  const r = chiffrerDevisEnregistre(devis, session.entreprise, produit);
  const regime = determinerRegimeTVA(devis.contexteFiscal);
  const existantes = (await store.factures()).filter((f) => f.chantierId === chantierId && f.statut !== "annulee" && f.type !== "avoir");

  let lignes: Facture["lignes"];
  let retenue = 0;
  if (type === "acompte") {
    const pct = Number(formData.get("pourcentage") ?? 30);
    const montant = Math.round(r.totaux.totalHT * pct) / 100;
    lignes = [{ lot: "chape", designation: `Acompte de ${pct} % sur devis ${devis.numero}${devis.version > 1 ? ` v${devis.version}` : ""} — ${devis.objet}`, unite: "forfait", quantite: 1, prixUnitaireHT: montant, montantHT: montant, tauxTVA: regime.taux }];
  } else {
    const dejaFacture = existantes.reduce((s, f) => s + f.totalHT, 0);
    const reste = Math.round((r.totaux.totalHT - dejaFacture) * 100) / 100;
    lignes = [
      ...r.lignes.map((l) => ({ ...l })),
      ...(dejaFacture > 0 ? [{ lot: "chape" as const, designation: "Acomptes déjà facturés", unite: "forfait" as const, quantite: 1, prixUnitaireHT: -dejaFacture, montantHT: -dejaFacture, tauxTVA: regime.taux }] : []),
    ];
    if (formData.get("retenueGarantie") === "on") retenue = Math.round(r.totaux.totalHT * 5) / 100;
    void reste;
  }
  const totalHT = Math.round(lignes.reduce((s, l) => s + l.montantHT, 0) * 100) / 100;
  const tva = regime.autoliquidation ? 0 : Math.round(totalHT * regime.taux) / 100;
  const echeance = new Date();
  echeance.setDate(echeance.getDate() + Math.min(client.conditionsPaiementJours, 60));

  const facture = await store.creerFacture({
    clientId: client.id,
    devisId: devis.id,
    chantierId,
    type,
    statut: "emise",
    dateEmission: new Date().toISOString().slice(0, 10),
    dateEcheance: echeance.toISOString().slice(0, 10),
    lignes,
    totalHT,
    tva,
    totalTTC: Math.round((totalHT + tva) * 100) / 100,
    retenueGarantie: retenue,
    autoliquidation: regime.autoliquidation,
    mentions: regime.mentions,
    paiements: [],
  });
  if (type === "solde") await store.mettreAJourChantier(chantierId, { statut: "facture" });
  revalidatePath("/app/factures");
  revalidatePath(`/app/chantiers/${chantierId}`);
  redirect(`/app/factures?nouvelle=${facture.id}`);
}
