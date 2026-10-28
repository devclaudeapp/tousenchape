import type { Alerte, ConfigurationChape, Piece, ProduitChape } from "@/lib/chape/types";
import type { GrilleTarifaire, LigneDevis, OptionsDevis } from "@/lib/chape/devis";
import type { ContexteFiscal } from "@/lib/chape/tva";

/**
 * Modèle applicatif, sérialisable (dates en ISO 8601) pour passer du serveur aux composants.
 */

export type RoleMembre = "gerant" | "bureau" | "chef_equipe" | "applicateur";
export type TypeClient = "particulier" | "professionnel" | "collectivite";
export type StatutDevis = "brouillon" | "envoye" | "signe" | "refuse" | "expire";
export type StatutChantier = "planifie" | "preparation" | "pret" | "coule" | "sechage" | "reception" | "facture" | "clos";
export type TypeFacture = "acompte" | "situation" | "solde" | "avoir";
export type StatutFacture = "brouillon" | "emise" | "payee" | "en_retard" | "annulee";
export type CanalCommande = "email" | "portail";

export interface Entreprise {
  id: string;
  nom: string;
  siren: string;
  tvaIntracom?: string;
  adresse: string;
  codePostal: string;
  ville: string;
  telephone?: string;
  email?: string;
  assureurDecennale?: string;
  numeroContratDecennale?: string;
  zoneCouvertureDecennale?: string;
  attestationDecennaleExpireLe?: string;
  mediateurConsommation?: string;
  formule: "essai" | "solo" | "equipe" | "entreprise";
  tauxPertes: number;
  grilleTarifaire: GrilleTarifaire;
}

export interface Membre {
  id: string;
  entrepriseId: string;
  nom: string;
  email: string;
  role: RoleMembre;
  equipe?: string;
  cqpNumero?: string;
  cqpDate?: string;
}

export interface Client {
  id: string;
  entrepriseId: string;
  type: TypeClient;
  nom: string;
  siren?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  codePostal?: string;
  ville?: string;
  conditionsPaiementJours: number;
  notes?: string;
  createdAt: string;
}

export interface Centrale {
  id: string;
  entrepriseId: string;
  nom: string;
  ville?: string;
  capaciteToupieM3: number;
  canalCommande: CanalCommande;
  email?: string;
  urlPortail?: string;
  delaiCommandeHeures: number;
}

export interface Produit extends ProduitChape {
  /** Null pour le référentiel partagé. */
  entrepriseId: string | null;
  centraleId?: string;
  prixM3?: number;
  sourceUrl?: string;
}

export interface Devis {
  id: string;
  entrepriseId: string;
  clientId: string;
  produitId?: string;
  numero: string;
  version: number;
  statut: StatutDevis;
  objet: string;
  adresseChantier: string;
  codePostalChantier: string;
  villeChantier: string;
  configuration: ConfigurationChape;
  pieces: Piece[];
  options: OptionsDevis;
  lignesLibres: Omit<LigneDevis, "montantHT" | "tauxTVA">[];
  contexteFiscal: ContexteFiscal;
  dateValidite: string;
  envoyeLe?: string;
  signeLe?: string;
  signatureNom?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LivraisonBon {
  id: string;
  chantierId: string;
  numeroBon: string;
  uniteProduction?: string;
  heureFabrication?: string;
  heureArrivee?: string;
  heureFinDechargement?: string;
  volumeM3: number;
  etalementDepartCm?: number;
  etalementChantierCm: number;
  eauAjouteeLParM3: number;
  alertes: Alerte[];
  signeParId?: string;
  createdAt: string;
}

export type TypeControle = "visite_technique" | "coulage" | "post_coulage" | "mesure_cm" | "reception";

export interface Controle {
  id: string;
  chantierId: string;
  type: TypeControle;
  /** Réponses à la checklist : clé → oui/non/na. */
  reponses: Record<string, "oui" | "non" | "na">;
  mesures: { type: string; valeur: number; unite: string; conforme: boolean; commentaire?: string }[];
  conforme: boolean | null;
  auteurId?: string;
  commentaire?: string;
  createdAt: string;
}

export interface Chantier {
  id: string;
  entrepriseId: string;
  devisId?: string;
  clientId: string;
  produitId?: string;
  centraleId?: string;
  chefEquipeId?: string;
  numero: string;
  statut: StatutChantier;
  adresse: string;
  codePostal: string;
  ville: string;
  accesCamion?: string;
  distancePompageM?: number;
  etage?: number;
  dateCoulage?: string;
  heurePremierCamion?: string;
  heureDebutCoulage?: string;
  heureFinCoulage?: string;
  surfaceCouleeM2?: number;
  natureSupport?: string;
  classementUPEC?: string;
  temperatureC?: number;
  motifReport?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Facture {
  id: string;
  entrepriseId: string;
  clientId: string;
  devisId?: string;
  chantierId?: string;
  numero: string;
  type: TypeFacture;
  statut: StatutFacture;
  dateEmission: string;
  dateEcheance: string;
  lignes: LigneDevis[];
  totalHT: number;
  tva: number;
  totalTTC: number;
  retenueGarantie: number;
  autoliquidation: boolean;
  mentions: string[];
  paiements: { id: string; montant: number; datePaiement: string; moyen?: string }[];
  createdAt: string;
}

/** Utilisateur connecté et son entreprise active. */
export interface Session {
  userId: string;
  email: string;
  membre: Membre;
  entreprise: Entreprise;
  demo: boolean;
}
