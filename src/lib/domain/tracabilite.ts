import type { Chantier, Client, Entreprise, LivraisonBon, Membre, Produit } from "@/lib/domain/types";

/**
 * Fiche de traçabilité QB46 (Règles professionnelles § 18, guide SNPB 2023) :
 * construite à partir du chantier, des bons de livraison et des contrôles, sans ressaisie.
 */

export interface ChampTracabilite {
  cle: string;
  libelle: string;
  valeur: string;
  manquant: boolean;
}

export interface FicheTracabilite {
  champs: ChampTracabilite[];
  livraisons: LivraisonBon[];
  complete: boolean;
  manquants: string[];
}

const fmtHeure = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : undefined);
const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : undefined);

export function construireFicheTracabilite(input: {
  chantier: Chantier;
  client: Client | null;
  entreprise: Entreprise;
  produit: Produit | null;
  chef: Membre | null;
  livraisons: LivraisonBon[];
}): FicheTracabilite {
  const { chantier, client, entreprise, produit, chef, livraisons } = input;
  const volume = livraisons.reduce((s, l) => s + l.volumeM3, 0);
  const etalements = livraisons.map((l) => `${l.etalementDepartCm ?? "?"} / ${l.etalementChantierCm} cm`).join(" ; ");
  const eau = livraisons.map((l) => `${l.eauAjouteeLParM3} l/m³`).join(" ; ");
  const unites = [...new Set(livraisons.map((l) => l.uniteProduction).filter(Boolean))].join(", ");
  const bons = livraisons.map((l) => l.numeroBon).join(", ");
  const datesFab = [...new Set(livraisons.map((l) => fmtDate(l.heureFabrication)).filter(Boolean))].join(", ");

  const champ = (cle: string, libelle: string, valeur?: string | number | null): ChampTracabilite => ({
    cle,
    libelle,
    valeur: valeur === undefined || valeur === null || valeur === "" ? "" : String(valeur),
    manquant: valeur === undefined || valeur === null || valeur === "",
  });

  const champs: ChampTracabilite[] = [
    champ("chape", "Référence de la chape", produit ? `${produit.fabricant} ${produit.nom}` : undefined),
    champ("certificat", "N° de certificat QB46 / Avis Technique", produit?.certificatQB46),
    champ("classe", "Classe de résistance", produit?.classe),
    champ("unite", "Unité de fabrication", unites || undefined),
    champ("bons", "N° de bon(s) de livraison", bons || undefined),
    champ("date_fab", "Date de fabrication", datesFab || undefined),
    champ("chapiste", "Entreprise chapiste", `${entreprise.nom} — SIREN ${entreprise.siren}`),
    champ("chef", "Chef d'équipe (CQP)", chef ? `${chef.nom}${chef.cqpNumero ? `, CQP ${chef.cqpNumero}` : " — CQP manquant"}` : undefined),
    champ("client", "Client", client?.nom),
    champ("adresse", "Adresse du chantier", `${chantier.adresse}, ${chantier.codePostal} ${chantier.ville}`),
    champ("etalements", "Étalements départ / chantier", etalements || undefined),
    champ("eau", "Eau ajoutée", eau || undefined),
    champ("support", "Nature du support", chantier.natureSupport),
    champ("surface", "Surface coulée", chantier.surfaceCouleeM2 !== undefined ? `${chantier.surfaceCouleeM2} m²` : undefined),
    champ("volume", "Volume livré", volume > 0 ? `${Math.round(volume * 100) / 100} m³` : undefined),
    champ("upec", "Classement UPEC du local", chantier.classementUPEC),
    champ("date_coulage", "Date de coulage", fmtDate(chantier.dateCoulage)),
    champ("heures", "Heures de début et de fin de coulage", chantier.heureDebutCoulage ? `${fmtHeure(chantier.heureDebutCoulage)} à ${fmtHeure(chantier.heureFinCoulage) ?? "?"}` : undefined),
    champ("temperature", "Température au coulage", chantier.temperatureC !== undefined ? `${chantier.temperatureC} °C` : undefined),
  ];

  const manquants = champs.filter((c) => c.manquant).map((c) => c.libelle);
  if (chef && !chef.cqpNumero) manquants.push("CQP du chef d'équipe");
  return { champs, livraisons, complete: manquants.length === 0, manquants };
}
