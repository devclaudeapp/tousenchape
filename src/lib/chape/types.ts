/**
 * Types du domaine « chape fluide ».
 *
 * Références : Règles professionnelles pour la mise en œuvre des chapes fluides
 * à base de ciment ou de sulfate de calcium (UNECP-FFB / CAPEB, janvier 2023),
 * désignées « RP » dans les commentaires.
 */

/** Liant de la chape. */
export type Liant = "sulfate_calcium" | "ciment";

/** Classe de résistance NF EN 13813 qui pilote les tableaux d'épaisseur (RP Tableaux 4 et 5). */
export type ClasseResistance = "C20-F4" | "C16-F3" | "C16-F4" | "C25-F5" | "C30-F6" | "C30-F8";

/** Mode de pose (RP § 10.3 et 11.3). */
export type ModePose = "adherente" | "desolidarisee" | "flottante";

/** Nature du support sous une chape désolidarisée. */
export type Support = "beton" | "bois" | "ancien_revetement" | "ravoirage" | "asphalte";

/** Classe de compressibilité de l'isolant sous une chape flottante. */
export type ClasseIsolant = "SC1" | "SC2";

/** Classement UPEC du local (P2 logement courant, P3 collectif / bureaux, P4 fort trafic). */
export type ClasseLocal = "P2" | "P3" | "P4";

/** Plancher chauffant enrobé par la chape (RP § 12). */
export type PlancherChauffant =
  | { type: "aucun" }
  | { type: "eau_A"; diametreTubeMm: number; isolantAPlots?: boolean }
  | { type: "eau_C"; diametreTubeMm: number }
  | { type: "electrique" };

/** Revêtement de sol prévu : fixe les seuils d'humidité et certaines épaisseurs maximales (RP § 14). */
export type Revetement =
  | "carrelage"
  | "pierre"
  | "pvc"
  | "linoleum"
  | "caoutchouc"
  | "parquet"
  | "textile"
  | "resine"
  | "inconnu";

/** Une pièce ou zone à couler. */
export interface Piece {
  id: string;
  nom: string;
  /** Surface en m². */
  surfaceM2: number;
  /** Périmètre en mètres linéaires (bande périphérique, remontée de film). */
  perimetreMl: number;
  /** Épaisseur prévue en cm. */
  epaisseurCm: number;
  /** Plus grande longueur du local en m (joints de fractionnement). */
  longueurMaxM?: number;
  /** Nombre de poteaux ou éléments verticaux à ceinturer. */
  poteaux?: number;
}

/** Configuration technique commune à un devis ou à un chantier. */
export interface ConfigurationChape {
  liant: Liant;
  classe: ClasseResistance;
  /** Chape fibrée (ciment uniquement, RP Tableaux 4 et 5). */
  fibree?: boolean;
  modePose: ModePose;
  support?: Support;
  classeIsolant?: ClasseIsolant;
  classeLocal: ClasseLocal;
  plancherChauffant: PlancherChauffant;
  revetement: Revetement;
  /** Retrait engagé dans le certificat QB46, en µm/m (ciment, RP Tableau 6). */
  retraitEngageUmParM?: number;
}

/** Caractéristiques produit issues du certificat QB46 / DTA. */
export interface ProduitChape {
  id: string;
  nom: string;
  fabricant: string;
  liant: Liant;
  classe: ClasseResistance;
  /** Plage d'étalement admise sur chantier, en cm (cône CEN / Hägermann). */
  etalementMinCm: number;
  etalementMaxCm: number;
  /** Ajout d'eau maximal autorisé sur chantier, en l/m³. */
  eauMaxLParM3: number;
  /** Temps d'utilisation après fabrication, en minutes. */
  tempsUtilisationMin: number;
  /** Masse volumique durcie, en kg/m³ (charge sur plancher). */
  masseVolumiqueKgM3: number;
  /** Première mise en chauffe au plus tôt, en jours après coulage (plancher chauffant). */
  miseEnChauffeJoursMin: number;
  certificatQB46?: string;
}

export type Severite = "info" | "attention" | "bloquant";

export interface Alerte {
  code: string;
  severite: Severite;
  message: string;
  /** Référence au texte (ex. « RP § 11.3.6, Tableau 8 »). */
  reference?: string;
}
