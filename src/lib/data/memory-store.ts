import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type {
  Centrale,
  Chantier,
  Client,
  Controle,
  Devis,
  DocumentEntreprise,
  Entreprise,
  Equipe,
  Facture,
  Indisponibilite,
  LivraisonBon,
  Materiel,
  Membre,
  Message,
  Pointage,
  Produit,
  RendezVous,
} from "@/lib/domain/types";
import {
  DEMO_ENTREPRISE_ID,
  demoCentrales,
  demoChantiers,
  demoClients,
  demoControles,
  demoDevis,
  demoEntreprise,
  demoEquipes,
  demoFactures,
  demoIndisponibilites,
  demoLivraisons,
  demoMembres,
  demoMessages,
  demoProduits,
  demoPointages,
  demoMateriels,
  demoRendezVous,
  demoDocuments,
} from "./demo-data";
import { numeroSuivant, type DataStore } from "./store";

/**
 * Magasin en mémoire pour le mode démo. Les données vivent le temps du processus serveur ;
 * un redémarrage les remet à l'état initial.
 */

interface Etat {
  entreprise: Entreprise;
  membres: Membre[];
  clients: Client[];
  centrales: Centrale[];
  produits: Produit[];
  devis: Devis[];
  chantiers: Chantier[];
  livraisons: LivraisonBon[];
  controles: Controle[];
  factures: Facture[];
  equipes: Equipe[];
  indisponibilites: Indisponibilite[];
  messages: Message[];
  pointages: Pointage[];
  materiels: Materiel[];
  rendezVous: RendezVous[];
  documents: DocumentEntreprise[];
}

const clone = <T>(x: T): T => structuredClone(x);

function etatInitial(): Etat {
  return clone({
    entreprise: demoEntreprise,
    membres: demoMembres,
    clients: demoClients,
    centrales: demoCentrales,
    produits: demoProduits,
    devis: demoDevis,
    chantiers: demoChantiers,
    livraisons: demoLivraisons,
    controles: demoControles,
    factures: demoFactures,
    equipes: demoEquipes,
    indisponibilites: demoIndisponibilites,
    messages: demoMessages,
    pointages: demoPointages,
    materiels: demoMateriels,
    rendezVous: demoRendezVous,
    documents: demoDocuments,
  });
}

// L'état est gardé sur globalThis (Next recharge les modules en développement) et
// recopié dans un fichier du dossier temporaire : il survit à un redémarrage du serveur
// et reste partagé si plusieurs processus servent l'application.
const FICHIER = path.join(os.tmpdir(), "tousenchape-demo.json");
const g = globalThis as unknown as { __tousenchapeDemo?: Etat; __tousenchapeDemoMtime?: number };

function etat(): Etat {
  try {
    const stat = fs.statSync(FICHIER);
    if (!g.__tousenchapeDemo || g.__tousenchapeDemoMtime !== stat.mtimeMs) {
      const lu = JSON.parse(fs.readFileSync(FICHIER, "utf8")) as Partial<Etat>;
      g.__tousenchapeDemo = { ...etatInitial(), ...lu } as Etat;
      g.__tousenchapeDemoMtime = stat.mtimeMs;
    }
  } catch {
    if (!g.__tousenchapeDemo) {
      g.__tousenchapeDemo = etatInitial();
      persister();
    }
  }
  return g.__tousenchapeDemo!;
}

function persister(): void {
  try {
    fs.writeFileSync(FICHIER, JSON.stringify(g.__tousenchapeDemo));
    g.__tousenchapeDemoMtime = fs.statSync(FICHIER).mtimeMs;
  } catch {
    // Système de fichiers en lecture seule : l'état reste en mémoire.
  }
}

export function reinitialiserDemo(): void {
  g.__tousenchapeDemo = etatInitial();
  persister();
}

const id = () => globalThis.crypto.randomUUID();
const maintenant = () => new Date().toISOString();

export class MemoryStore implements DataStore {
  readonly entrepriseId = DEMO_ENTREPRISE_ID;

  async entreprise() {
    return clone(etat().entreprise);
  }
  async mettreAJourEntreprise(patch: Partial<Entreprise>) {
    const e = etat();
    e.entreprise = { ...e.entreprise, ...patch, id: e.entreprise.id };
    persister();
    return clone(e.entreprise);
  }
  async membres() {
    return clone(etat().membres);
  }
  async membre(mid: string) {
    return clone(etat().membres.find((m) => m.id === mid) ?? null);
  }
  async creerMembre(data: Omit<Membre, "id" | "entrepriseId">) {
    const m: Membre = { ...data, id: id(), entrepriseId: this.entrepriseId };
    etat().membres.push(m);
    persister();
    return clone(m);
  }
  async mettreAJourMembre(mid: string, patch: Partial<Membre>) {
    const e = etat();
    const i = e.membres.findIndex((m) => m.id === mid);
    if (i < 0) throw new Error("Membre introuvable.");
    e.membres[i] = { ...e.membres[i]!, ...patch, id: mid };
    persister();
    return clone(e.membres[i]!);
  }

  async equipes() {
    return clone(etat().equipes);
  }
  async creerEquipe(data: Omit<Equipe, "id" | "entrepriseId">) {
    const eq: Equipe = { ...data, id: id(), entrepriseId: this.entrepriseId };
    etat().equipes.push(eq);
    persister();
    return clone(eq);
  }
  async mettreAJourEquipe(eid: string, patch: Partial<Equipe>) {
    const e = etat();
    const i = e.equipes.findIndex((x) => x.id === eid);
    if (i < 0) throw new Error("Équipe introuvable.");
    e.equipes[i] = { ...e.equipes[i]!, ...patch, id: eid };
    persister();
    return clone(e.equipes[i]!);
  }

  async indisponibilites() {
    return clone(etat().indisponibilites).sort((a, b) => a.debut.localeCompare(b.debut));
  }
  async creerIndisponibilite(data: Omit<Indisponibilite, "id" | "entrepriseId" | "createdAt">) {
    const ind: Indisponibilite = { ...data, id: id(), entrepriseId: this.entrepriseId, createdAt: maintenant() };
    etat().indisponibilites.push(ind);
    persister();
    return clone(ind);
  }
  async supprimerIndisponibilite(iid: string) {
    const e = etat();
    e.indisponibilites = e.indisponibilites.filter((x) => x.id !== iid);
    persister();
  }

  async messages(chantierId?: string) {
    return clone(etat().messages.filter((m) => !chantierId || m.chantierId === chantierId)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async creerMessage(data: Omit<Message, "id" | "entrepriseId" | "createdAt">) {
    const m: Message = { ...data, id: id(), entrepriseId: this.entrepriseId, createdAt: maintenant() };
    etat().messages.push(m);
    persister();
    return clone(m);
  }
  async mettreAJourMessage(mid: string, patch: Partial<Message>) {
    const e = etat();
    const i = e.messages.findIndex((m) => m.id === mid);
    if (i < 0) throw new Error("Message introuvable.");
    e.messages[i] = { ...e.messages[i]!, ...patch, id: mid };
    persister();
    return clone(e.messages[i]!);
  }
  async enregistrerPhoto(dataUrl: string) {
    // En démo, la photo compressée reste inline.
    return dataUrl;
  }

  async pointages(filtre: { membreId?: string; chantierId?: string; depuis?: string; jusqua?: string } = {}) {
    return clone(
      etat().pointages.filter(
        (p) => (!filtre.membreId || p.membreId === filtre.membreId) && (!filtre.chantierId || p.chantierId === filtre.chantierId) && (!filtre.depuis || p.date >= filtre.depuis) && (!filtre.jusqua || p.date <= filtre.jusqua),
      ),
    ).sort((a, b) => a.debut.localeCompare(b.debut));
  }
  async pointage(pid: string) {
    return clone(etat().pointages.find((p) => p.id === pid) ?? null);
  }
  async creerPointage(data: Omit<Pointage, "id" | "entrepriseId" | "createdAt">) {
    const p: Pointage = { ...data, id: id(), entrepriseId: this.entrepriseId, createdAt: maintenant() };
    etat().pointages.push(p);
    persister();
    return clone(p);
  }
  async mettreAJourPointage(pid: string, patch: Partial<Pointage>) {
    const e = etat();
    const i = e.pointages.findIndex((p) => p.id === pid);
    if (i < 0) throw new Error("Pointage introuvable.");
    e.pointages[i] = { ...e.pointages[i]!, ...patch, id: pid };
    persister();
    return clone(e.pointages[i]!);
  }

  async materiels() {
    return clone(etat().materiels);
  }
  async creerMateriel(data: Omit<Materiel, "id" | "entrepriseId">) {
    const m: Materiel = { ...data, id: id(), entrepriseId: this.entrepriseId };
    etat().materiels.push(m);
    persister();
    return clone(m);
  }
  async mettreAJourMateriel(mid: string, patch: Partial<Materiel>) {
    const e = etat();
    const i = e.materiels.findIndex((m) => m.id === mid);
    if (i < 0) throw new Error("Matériel introuvable.");
    e.materiels[i] = { ...e.materiels[i]!, ...patch, id: mid };
    persister();
    return clone(e.materiels[i]!);
  }

  async rendezVous() {
    return clone(etat().rendezVous).sort((a, b) => `${a.date}${a.heure}`.localeCompare(`${b.date}${b.heure}`));
  }
  async creerRendezVous(data: Omit<RendezVous, "id" | "entrepriseId" | "createdAt">) {
    const r: RendezVous = { ...data, id: id(), entrepriseId: this.entrepriseId, createdAt: maintenant() };
    etat().rendezVous.push(r);
    persister();
    return clone(r);
  }
  async mettreAJourRendezVous(rid: string, patch: Partial<RendezVous>) {
    const e = etat();
    const i = e.rendezVous.findIndex((r) => r.id === rid);
    if (i < 0) throw new Error("Rendez-vous introuvable.");
    e.rendezVous[i] = { ...e.rendezVous[i]!, ...patch, id: rid };
    persister();
    return clone(e.rendezVous[i]!);
  }
  async supprimerRendezVous(rid: string) {
    const e = etat();
    e.rendezVous = e.rendezVous.filter((r) => r.id !== rid);
    persister();
  }

  async documents() {
    return clone(etat().documents);
  }
  async creerDocument(data: Omit<DocumentEntreprise, "id" | "entrepriseId" | "createdAt">) {
    const d: DocumentEntreprise = { ...data, id: id(), entrepriseId: this.entrepriseId, createdAt: maintenant() };
    etat().documents.push(d);
    persister();
    return clone(d);
  }
  async supprimerDocument(did: string) {
    const e = etat();
    e.documents = e.documents.filter((d) => d.id !== did);
    persister();
  }

  async clients() {
    return clone(etat().clients).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  }
  async client(cid: string) {
    return clone(etat().clients.find((c) => c.id === cid) ?? null);
  }
  async creerClient(data: Omit<Client, "id" | "entrepriseId" | "createdAt">) {
    const c: Client = { ...data, id: id(), entrepriseId: this.entrepriseId, createdAt: maintenant() };
    etat().clients.push(c);
    persister();
    return clone(c);
  }
  async mettreAJourClient(cid: string, patch: Partial<Client>) {
    const e = etat();
    const i = e.clients.findIndex((c) => c.id === cid);
    if (i < 0) throw new Error("Client introuvable.");
    e.clients[i] = { ...e.clients[i]!, ...patch, id: cid };
    persister();
    return clone(e.clients[i]!);
  }

  async centrales() {
    return clone(etat().centrales);
  }
  async creerCentrale(data: Omit<Centrale, "id" | "entrepriseId">) {
    const c: Centrale = { ...data, id: id(), entrepriseId: this.entrepriseId };
    etat().centrales.push(c);
    persister();
    return clone(c);
  }
  async produits() {
    return clone(etat().produits);
  }
  async produit(pid: string) {
    return clone(etat().produits.find((p) => p.id === pid) ?? null);
  }

  async devisListe() {
    return clone(etat().devis).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async devis(did: string) {
    return clone(etat().devis.find((d) => d.id === did) ?? null);
  }
  async creerDevis(data: Omit<Devis, "id" | "entrepriseId" | "numero" | "version" | "createdAt" | "updatedAt">) {
    const e = etat();
    const d: Devis = {
      ...data,
      id: id(),
      entrepriseId: this.entrepriseId,
      numero: numeroSuivant("DEV", e.devis.map((x) => x.numero)),
      version: 1,
      createdAt: maintenant(),
      updatedAt: maintenant(),
    };
    e.devis.push(d);
    persister();
    return clone(d);
  }
  async mettreAJourDevis(did: string, patch: Partial<Devis>) {
    const e = etat();
    const i = e.devis.findIndex((d) => d.id === did);
    if (i < 0) throw new Error("Devis introuvable.");
    e.devis[i] = { ...e.devis[i]!, ...patch, id: did, updatedAt: maintenant() };
    persister();
    return clone(e.devis[i]!);
  }

  async chantiers() {
    return clone(etat().chantiers).sort((a, b) => (a.dateCoulage ?? "9999").localeCompare(b.dateCoulage ?? "9999"));
  }
  async chantier(cid: string) {
    return clone(etat().chantiers.find((c) => c.id === cid) ?? null);
  }
  async creerChantier(data: Omit<Chantier, "id" | "entrepriseId" | "numero" | "createdAt" | "updatedAt">) {
    const e = etat();
    const c: Chantier = {
      ...data,
      id: id(),
      entrepriseId: this.entrepriseId,
      numero: numeroSuivant("CH", e.chantiers.map((x) => x.numero)),
      createdAt: maintenant(),
      updatedAt: maintenant(),
    };
    e.chantiers.push(c);
    persister();
    return clone(c);
  }
  async mettreAJourChantier(cid: string, patch: Partial<Chantier>) {
    const e = etat();
    const i = e.chantiers.findIndex((c) => c.id === cid);
    if (i < 0) throw new Error("Chantier introuvable.");
    e.chantiers[i] = { ...e.chantiers[i]!, ...patch, id: cid, updatedAt: maintenant() };
    persister();
    return clone(e.chantiers[i]!);
  }

  async livraisons(chantierId: string) {
    return clone(etat().livraisons.filter((l) => l.chantierId === chantierId)).sort((a, b) =>
      (a.heureArrivee ?? a.createdAt).localeCompare(b.heureArrivee ?? b.createdAt),
    );
  }
  async ajouterLivraison(data: Omit<LivraisonBon, "id" | "createdAt">) {
    const l: LivraisonBon = { ...data, id: id(), createdAt: maintenant() };
    etat().livraisons.push(l);
    persister();
    return clone(l);
  }
  async controles(chantierId: string) {
    return clone(etat().controles.filter((c) => c.chantierId === chantierId)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async ajouterControle(data: Omit<Controle, "id" | "createdAt">) {
    const c: Controle = { ...data, id: id(), createdAt: maintenant() };
    etat().controles.push(c);
    persister();
    return clone(c);
  }

  async factures() {
    return clone(etat().factures).sort((a, b) => b.dateEmission.localeCompare(a.dateEmission));
  }
  async facture(fid: string) {
    return clone(etat().factures.find((f) => f.id === fid) ?? null);
  }
  async creerFacture(data: Omit<Facture, "id" | "entrepriseId" | "numero" | "createdAt">) {
    const e = etat();
    const f: Facture = {
      ...data,
      id: id(),
      entrepriseId: this.entrepriseId,
      numero: numeroSuivant("FA", e.factures.map((x) => x.numero)),
      createdAt: maintenant(),
    };
    e.factures.push(f);
    persister();
    return clone(f);
  }
  async mettreAJourFacture(fid: string, patch: Partial<Facture>) {
    const e = etat();
    const i = e.factures.findIndex((f) => f.id === fid);
    if (i < 0) throw new Error("Facture introuvable.");
    if (e.factures[i]!.statut !== "brouillon" && (patch.lignes || patch.totalTTC !== undefined || patch.numero)) {
      throw new Error("Une facture émise ne peut pas être modifiée : créez un avoir.");
    }
    e.factures[i] = { ...e.factures[i]!, ...patch, id: fid };
    persister();
    return clone(e.factures[i]!);
  }
}
