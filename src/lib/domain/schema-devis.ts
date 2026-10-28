import { z } from "zod";

/** Schéma de validation d'un devis saisi dans l'éditeur, partagé entre le client et l'action serveur. */
const piece = z.object({
  id: z.string(),
  nom: z.string().trim().min(1),
  surfaceM2: z.number().positive(),
  perimetreMl: z.number().min(0),
  epaisseurCm: z.number().positive(),
  longueurMaxM: z.number().positive().optional(),
  poteaux: z.number().int().min(0).optional(),
});

const configuration = z.object({
  liant: z.enum(["sulfate_calcium", "ciment"]),
  classe: z.enum(["C20-F4", "C16-F3", "C16-F4", "C25-F5", "C30-F6", "C30-F8"]),
  fibree: z.boolean().optional(),
  modePose: z.enum(["adherente", "desolidarisee", "flottante"]),
  support: z.enum(["beton", "bois", "ancien_revetement", "ravoirage", "asphalte"]).optional(),
  classeIsolant: z.enum(["SC1", "SC2"]).optional(),
  classeLocal: z.enum(["P2", "P3", "P4"]),
  plancherChauffant: z.discriminatedUnion("type", [
    z.object({ type: z.literal("aucun") }),
    z.object({ type: z.literal("eau_A"), diametreTubeMm: z.number().positive(), isolantAPlots: z.boolean().optional() }),
    z.object({ type: z.literal("eau_C"), diametreTubeMm: z.number().positive() }),
    z.object({ type: z.literal("electrique") }),
  ]),
  revetement: z.enum(["carrelage", "pierre", "pvc", "linoleum", "caoutchouc", "parquet", "textile", "resine", "inconnu"]),
  retraitEngageUmParM: z.number().positive().optional(),
});

const options = z.object({
  film: z.boolean(),
  bandePeripherique: z.boolean(),
  poncage: z.boolean(),
  primaire: z.boolean(),
  isolant: z.boolean(),
  mesureCM: z.boolean(),
  joursCoulage: z.number().int().min(1).max(30),
  distanceDepotKm: z.number().min(0).max(500),
  pompageDifficile: z.boolean(),
});

const ligneLibre = z.object({
  lot: z.enum(["preparation", "isolation", "chape", "finition", "carrelage"]),
  designation: z.string().trim().min(1),
  unite: z.enum(["m²", "m³", "ml", "forfait", "u", "jour"]),
  quantite: z.number().min(0),
  prixUnitaireHT: z.number().min(0),
});

const contexteFiscal = z.object({
  typeClient: z.enum(["particulier", "professionnel", "collectivite"]),
  sousTraitance: z.boolean(),
  habitation: z.boolean(),
  logementPlusDe2Ans: z.boolean(),
  natureTravaux: z.enum(["neuf", "amelioration", "renovation_energetique"]),
  horsEtablissement: z.boolean(),
});

export const schemaDevis = z.object({
  clientId: z.string().min(1, "Choisissez un client."),
  produitId: z.string().min(1, "Choisissez un produit."),
  objet: z.string().trim().min(3, "Décrivez l'objet du devis."),
  adresseChantier: z.string().trim(),
  codePostalChantier: z.string().trim(),
  villeChantier: z.string().trim(),
  configuration,
  pieces: z.array(piece).min(1, "Ajoutez au moins une pièce."),
  options,
  lignesLibres: z.array(ligneLibre),
  contexteFiscal,
  dateValidite: z.string(),
  notes: z.string().optional(),
});

export type DonneesDevis = z.infer<typeof schemaDevis>;
