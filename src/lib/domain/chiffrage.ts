import { chiffrerDevis, type ResultatDevis } from "@/lib/chape/devis";
import type { Devis, Entreprise, Produit } from "@/lib/domain/types";

/** Chiffre un devis enregistré avec la grille de l'entreprise et le prix du produit choisi. */
export function chiffrerDevisEnregistre(devis: Devis, entreprise: Entreprise, produit?: Produit | null): ResultatDevis {
  const grille = produit?.prixM3 ? { ...entreprise.grilleTarifaire, prixMortierM3: produit.prixM3 } : entreprise.grilleTarifaire;
  return chiffrerDevis({
    pieces: devis.pieces,
    config: devis.configuration,
    options: devis.options,
    lignesLibres: devis.lignesLibres,
    grille,
    parametres: { tauxPertes: entreprise.tauxPertes },
    fiscal: devis.contexteFiscal,
  });
}
