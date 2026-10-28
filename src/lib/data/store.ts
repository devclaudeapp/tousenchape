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

/**
 * Accès aux données d'une entreprise. Deux implémentations :
 * - SupabaseStore (production), où RLS fait respecter l'isolation ;
 * - MemoryStore (mode démo), en mémoire, sans configuration.
 *
 * Toutes les méthodes sont déjà bornées à l'entreprise de la session.
 */
export interface DataStore {
  readonly entrepriseId: string;

  entreprise(): Promise<Entreprise>;
  mettreAJourEntreprise(patch: Partial<Entreprise>): Promise<Entreprise>;
  membres(): Promise<Membre[]>;

  clients(): Promise<Client[]>;
  client(id: string): Promise<Client | null>;
  creerClient(data: Omit<Client, "id" | "entrepriseId" | "createdAt">): Promise<Client>;
  mettreAJourClient(id: string, patch: Partial<Client>): Promise<Client>;

  centrales(): Promise<Centrale[]>;
  creerCentrale(data: Omit<Centrale, "id" | "entrepriseId">): Promise<Centrale>;
  produits(): Promise<Produit[]>;
  produit(id: string): Promise<Produit | null>;

  devisListe(): Promise<Devis[]>;
  devis(id: string): Promise<Devis | null>;
  creerDevis(data: Omit<Devis, "id" | "entrepriseId" | "numero" | "version" | "createdAt" | "updatedAt">): Promise<Devis>;
  mettreAJourDevis(id: string, patch: Partial<Devis>): Promise<Devis>;

  chantiers(): Promise<Chantier[]>;
  chantier(id: string): Promise<Chantier | null>;
  creerChantier(data: Omit<Chantier, "id" | "entrepriseId" | "numero" | "createdAt" | "updatedAt">): Promise<Chantier>;
  mettreAJourChantier(id: string, patch: Partial<Chantier>): Promise<Chantier>;

  livraisons(chantierId: string): Promise<LivraisonBon[]>;
  ajouterLivraison(data: Omit<LivraisonBon, "id" | "createdAt">): Promise<LivraisonBon>;
  controles(chantierId: string): Promise<Controle[]>;
  ajouterControle(data: Omit<Controle, "id" | "createdAt">): Promise<Controle>;

  factures(): Promise<Facture[]>;
  facture(id: string): Promise<Facture | null>;
  creerFacture(data: Omit<Facture, "id" | "entrepriseId" | "numero" | "createdAt">): Promise<Facture>;
  mettreAJourFacture(id: string, patch: Partial<Facture>): Promise<Facture>;
}

/** Numérotation continue : PREFIXE-AAAA-NNNN. */
export function numeroSuivant(prefixe: string, existants: string[], annee = new Date().getFullYear()): string {
  const motif = new RegExp(`^${prefixe}-${annee}-(\\d{4})$`);
  let max = 0;
  for (const n of existants) {
    const m = motif.exec(n);
    if (m?.[1]) max = Math.max(max, Number(m[1]));
  }
  return `${prefixe}-${annee}-${String(max + 1).padStart(4, "0")}`;
}
