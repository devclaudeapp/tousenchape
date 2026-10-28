import type {
  Centrale,
  Chantier,
  Client,
  Controle,
  Devis,
  Entreprise,
  Facture,
  LivraisonBon,
  Membre,
  Produit,
} from "@/lib/domain/types";
import {
  DEMO_ENTREPRISE_ID,
  demoCentrales,
  demoChantiers,
  demoClients,
  demoControles,
  demoDevis,
  demoEntreprise,
  demoFactures,
  demoLivraisons,
  demoMembres,
  demoProduits,
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
  });
}

// En développement, Next recharge les modules : on garde l'état sur globalThis.
const g = globalThis as unknown as { __tousenchapeDemo?: Etat };
function etat(): Etat {
  if (!g.__tousenchapeDemo) g.__tousenchapeDemo = etatInitial();
  return g.__tousenchapeDemo;
}

export function reinitialiserDemo(): void {
  g.__tousenchapeDemo = etatInitial();
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
    return clone(e.entreprise);
  }
  async membres() {
    return clone(etat().membres);
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
    return clone(c);
  }
  async mettreAJourClient(cid: string, patch: Partial<Client>) {
    const e = etat();
    const i = e.clients.findIndex((c) => c.id === cid);
    if (i < 0) throw new Error("Client introuvable.");
    e.clients[i] = { ...e.clients[i]!, ...patch, id: cid };
    return clone(e.clients[i]!);
  }

  async centrales() {
    return clone(etat().centrales);
  }
  async creerCentrale(data: Omit<Centrale, "id" | "entrepriseId">) {
    const c: Centrale = { ...data, id: id(), entrepriseId: this.entrepriseId };
    etat().centrales.push(c);
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
    return clone(d);
  }
  async mettreAJourDevis(did: string, patch: Partial<Devis>) {
    const e = etat();
    const i = e.devis.findIndex((d) => d.id === did);
    if (i < 0) throw new Error("Devis introuvable.");
    e.devis[i] = { ...e.devis[i]!, ...patch, id: did, updatedAt: maintenant() };
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
    return clone(c);
  }
  async mettreAJourChantier(cid: string, patch: Partial<Chantier>) {
    const e = etat();
    const i = e.chantiers.findIndex((c) => c.id === cid);
    if (i < 0) throw new Error("Chantier introuvable.");
    e.chantiers[i] = { ...e.chantiers[i]!, ...patch, id: cid, updatedAt: maintenant() };
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
    return clone(l);
  }
  async controles(chantierId: string) {
    return clone(etat().controles.filter((c) => c.chantierId === chantierId)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async ajouterControle(data: Omit<Controle, "id" | "createdAt">) {
    const c: Controle = { ...data, id: id(), createdAt: maintenant() };
    etat().controles.push(c);
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
    return clone(e.factures[i]!);
  }
}
