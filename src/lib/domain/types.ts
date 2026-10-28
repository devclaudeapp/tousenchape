import type { Alerte, ConfigurationChape, Piece, ProduitChape } from "@/lib/chape/types";
import type { GrilleTarifaire, LigneDevis, OptionsDevis } from "@/lib/chape/devis";
import type { ContexteFiscal } from "@/lib/chape/tva";
import type { Habilitation, MotifIndisponibilite, TypeContrat } from "@/lib/domain/habilitations";
import type { ParametresPaie, StatutPointage, TypePointage } from "@/lib/domain/heures";

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
  parametresPaie?: ParametresPaie;
  /** Position du dépôt, pour les zones de petit déplacement. */
  depotLat?: number;
  depotLng?: number;
  /** Coût horaire chargé par défaut, en €. */
  coutHoraireDefaut?: number;
}

export interface Membre {
  id: string;
  entrepriseId: string;
  nom: string;
  email: string;
  telephone?: string;
  role: RoleMembre;
  equipeId?: string;
  typeContrat?: TypeContrat;
  dateEntree?: string;
  /** CQP chef d'équipe chapiste : exigé sur chaque chantier depuis le 1er août 2024. */
  cqpNumero?: string;
  cqpDate?: string;
  habilitations: Habilitation[];
  actif: boolean;
  notes?: string;
  /** Matricule paie, repris dans l'export pour l'expert-comptable. */
  matricule?: string;
  /** Coût horaire chargé, en €, pour la rentabilité réelle (jamais visible de l'équipe). */
  coutHoraire?: number;
}

export interface Pointage {
  id: string;
  entrepriseId: string;
  membreId: string;
  chantierId?: string;
  /** Journée ISO AAAA-MM-JJ. */
  date: string;
  debut: string;
  fin?: string;
  pauseMin: number;
  type: TypePointage;
  zoneTrajet?: number | null;
  panier: boolean;
  grandDeplacement: boolean;
  statut: StatutPointage;
  latDebut?: number;
  lngDebut?: number;
  latFin?: number;
  lngFin?: number;
  /** Distance entre le pointage et le chantier, en km, quand les deux positions sont connues. */
  ecartChantierKm?: number;
  commentaire?: string;
  valideChefId?: string;
  valideBureauId?: string;
  createdAt: string;
}

export type TypeMateriel = "pompe" | "malaxeur" | "camion" | "laser" | "bombe_cm" | "autre";
export type TypeControleMateriel = "vgp" | "entretien" | "controle_technique" | "etalonnage" | "autre";

export interface ControleMateriel {
  id: string;
  type: TypeControleMateriel;
  libelle?: string;
  dateFait?: string;
  prochaineDate?: string;
  commentaire?: string;
}

export interface Materiel {
  id: string;
  entrepriseId: string;
  type: TypeMateriel;
  nom: string;
  immatriculation?: string;
  numeroSerie?: string;
  dateAchat?: string;
  equipeId?: string;
  actif: boolean;
  controles: ControleMateriel[];
  notes?: string;
}

export type TypeRendezVous = "visite_technique" | "metre" | "rdv_client" | "autre";

export interface RendezVous {
  id: string;
  entrepriseId: string;
  type: TypeRendezVous;
  date: string;
  heure: string;
  dureeMin: number;
  chantierId?: string;
  clientId?: string;
  membreId?: string;
  adresse?: string;
  notes?: string;
  rappelEnvoyeLe?: string;
  createdAt: string;
}

export type TypeDocumentEntreprise = "kbis" | "urssaf" | "decennale" | "rc_pro" | "liste_salaries" | "rib" | "autre";

export interface DocumentEntreprise {
  id: string;
  entrepriseId: string;
  type: TypeDocumentEntreprise;
  nom: string;
  dateFin?: string;
  url?: string;
  createdAt: string;
}

export interface Equipe {
  id: string;
  entrepriseId: string;
  nom: string;
  /** Couleur d'affichage dans le planning (classe Tailwind ou code hexadécimal). */
  couleur: string;
  chefId?: string;
  /** Surface qu'une équipe coule confortablement en une journée, en m². */
  capaciteM2Jour: number;
}

export interface Indisponibilite {
  id: string;
  entrepriseId: string;
  membreId: string;
  /** Dates ISO AAAA-MM-JJ, bornes incluses. */
  debut: string;
  fin: string;
  motif: MotifIndisponibilite;
  commentaire?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  entrepriseId: string;
  chantierId: string;
  auteurId: string;
  texte: string;
  /** Photo compressée (data URL en démo, URL de stockage avec Supabase). */
  photoUrl?: string;
  /** Un signalement remonte dans les alertes du patron jusqu'à sa prise en compte. */
  signalement: boolean;
  traiteLe?: string;
  createdAt: string;
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
  equipeId?: string;
  chefEquipeId?: string;
  /** Renforts du jour (intérimaires, prêt d'une autre équipe). */
  renforts?: { nom: string; origine?: string }[];
  /** Surface prévue au devis, en m² (charge du planning). */
  surfacePrevueM2?: number;
  materielIds?: string[];
  latitude?: number;
  longitude?: number;
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
