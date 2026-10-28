import { controlerEpaisseurs } from "./epaisseurs";
import { evaluerJoints } from "./joints";
import { determinerRegimeTVA, type ContexteFiscal, type RegimeTVA, type TauxTVA } from "./tva";
import type { Alerte, ConfigurationChape, Piece } from "./types";
import { calculerQuantites, type ParametresQuantites, type Quantites } from "./volume";

/**
 * Chiffrage d'un devis : lignes par lot, totaux et alertes.
 */

export type Lot = "preparation" | "isolation" | "chape" | "finition" | "carrelage";

export interface GrilleTarifaire {
  /** Prix du mortier départ centrale, en € HT par m³. */
  prixMortierM3: number;
  /** Coefficient appliqué au prix d'achat du mortier (1,25 = 25 % de marge). */
  coefficientMortier: number;
  /** Main-d'œuvre de coulage, en € HT par m², par tranche de surface croissante. */
  mainOeuvreParTranche: { jusquaM2: number | null; prixM2: number }[];
  /** Pompe et déplacement, forfait par jour de coulage, en € HT. */
  forfaitPompeJour: number;
  /** Majoration par km au-delà de la franchise, en € HT. */
  prixKmSupplementaire: number;
  franchiseKm: number;
  /** Plus-value quand le tuyau dépasse 50 m ou que le coulage se fait en étage, en € HT. */
  plusValuePompageDifficile: number;
  prixFilmM2: number;
  prixBandeMl: number;
  prixPoncageM2: number;
  prixPrimaireM2: number;
  prixIsolantM2: { SC1: number; SC2: number };
  prixMesureCM: number;
  /** Minimum de facturation par chantier, en € HT. */
  minimumFacturation: number;
  /** Ligne de gestion des déchets, obligatoire sur le devis (arrêté du 24 janvier 2017), en € HT. */
  forfaitDechets: number;
}

export const GRILLE_DEMO: GrilleTarifaire = {
  prixMortierM3: 120,
  coefficientMortier: 1.25,
  mainOeuvreParTranche: [
    { jusquaM2: 50, prixM2: 14 },
    { jusquaM2: 150, prixM2: 11 },
    { jusquaM2: 400, prixM2: 9 },
    { jusquaM2: null, prixM2: 8 },
  ],
  forfaitPompeJour: 350,
  prixKmSupplementaire: 1.8,
  franchiseKm: 30,
  plusValuePompageDifficile: 250,
  prixFilmM2: 1.2,
  prixBandeMl: 1.5,
  prixPoncageM2: 2.5,
  prixPrimaireM2: 3,
  prixIsolantM2: { SC1: 18, SC2: 14 },
  prixMesureCM: 90,
  minimumFacturation: 750,
  forfaitDechets: 60,
};

export interface OptionsDevis {
  film: boolean;
  bandePeripherique: boolean;
  poncage: boolean;
  primaire: boolean;
  isolant: boolean;
  mesureCM: boolean;
  /** Nombre de jours de coulage (pompe). */
  joursCoulage: number;
  distanceDepotKm: number;
  pompageDifficile: boolean;
}

export const OPTIONS_DEVIS_DEFAUT: OptionsDevis = {
  film: true,
  bandePeripherique: true,
  poncage: true,
  primaire: false,
  isolant: false,
  mesureCM: false,
  joursCoulage: 1,
  distanceDepotKm: 20,
  pompageDifficile: false,
};

export interface LigneDevis {
  lot: Lot;
  designation: string;
  unite: "m²" | "m³" | "ml" | "forfait" | "u" | "jour";
  quantite: number;
  prixUnitaireHT: number;
  montantHT: number;
  tauxTVA: TauxTVA;
}

export interface TotauxDevis {
  totalHT: number;
  tva: number;
  totalTTC: number;
  /** Détail par taux de TVA. */
  parTaux: { taux: TauxTVA; baseHT: number; tva: number }[];
  minimumApplique: boolean;
}

export interface ResultatDevis {
  quantites: Quantites;
  lignes: LigneDevis[];
  totaux: TotauxDevis;
  regime: RegimeTVA;
  alertes: Alerte[];
}

const arrondi2 = (x: number) => Math.round(x * 100) / 100;

export function prixMainOeuvreM2(surfaceM2: number, grille: GrilleTarifaire): number {
  for (const tranche of grille.mainOeuvreParTranche) {
    if (tranche.jusquaM2 === null || surfaceM2 <= tranche.jusquaM2) return tranche.prixM2;
  }
  const derniere = grille.mainOeuvreParTranche.at(-1);
  return derniere ? derniere.prixM2 : 0;
}

export function chiffrerDevis(input: {
  pieces: Piece[];
  config: ConfigurationChape;
  options?: Partial<OptionsDevis>;
  grille?: GrilleTarifaire;
  parametres?: Partial<ParametresQuantites>;
  fiscal: ContexteFiscal;
  /** Lignes libres ajoutées par le métreur (carrelage, ravoirage…). */
  lignesLibres?: Omit<LigneDevis, "montantHT" | "tauxTVA">[];
}): ResultatDevis {
  const options = { ...OPTIONS_DEVIS_DEFAUT, ...input.options };
  const grille = input.grille ?? GRILLE_DEMO;
  const regime = determinerRegimeTVA(input.fiscal);
  const q = calculerQuantites(input.pieces, input.parametres);
  const taux = regime.taux;

  const ligne = (
    lot: Lot,
    designation: string,
    unite: LigneDevis["unite"],
    quantite: number,
    prixUnitaireHT: number,
  ): LigneDevis => ({
    lot,
    designation,
    unite,
    quantite: arrondi2(quantite),
    prixUnitaireHT: arrondi2(prixUnitaireHT),
    montantHT: arrondi2(quantite * prixUnitaireHT),
    tauxTVA: taux,
  });

  const lignes: LigneDevis[] = [];
  const liantLibelle = input.config.liant === "sulfate_calcium" ? "sulfate de calcium" : "ciment";

  if (options.primaire) lignes.push(ligne("preparation", "Primaire d'accrochage", "m²", q.surfaceM2, grille.prixPrimaireM2));
  if (options.isolant) {
    const classe = input.config.classeIsolant ?? "SC1";
    lignes.push(ligne("isolation", `Isolant sous chape classe ${classe}`, "m²", q.surfaceM2, grille.prixIsolantM2[classe]));
  }
  if (q.volumeCommandeM3 > 0) {
    lignes.push(
      ligne(
        "chape",
        `Mortier de chape fluide ${liantLibelle} ${input.config.classe}, pertes ${Math.round((input.parametres?.tauxPertes ?? 0.05) * 100)} % comprises`,
        "m³",
        q.volumeCommandeM3,
        grille.prixMortierM3 * grille.coefficientMortier,
      ),
    );
    lignes.push(
      ligne(
        "chape",
        `Coulage et finition, épaisseur moyenne ${q.epaisseurMoyenneCm} cm`,
        "m²",
        q.surfaceM2,
        prixMainOeuvreM2(q.surfaceM2, grille),
      ),
    );
  }
  if (options.film) lignes.push(ligne("chape", "Film polyéthylène 200 µm, recouvrements et remontées compris", "m²", q.filmM2, grille.prixFilmM2));
  if (options.bandePeripherique) lignes.push(ligne("chape", "Bande périphérique compressible", "ml", q.bandePeripheriqueMl, grille.prixBandeMl));

  const pompe = grille.forfaitPompeJour + Math.max(0, options.distanceDepotKm - grille.franchiseKm) * grille.prixKmSupplementaire;
  lignes.push(ligne("chape", `Pompe et déplacement (${options.distanceDepotKm} km)`, "jour", options.joursCoulage, pompe));
  if (options.pompageDifficile) lignes.push(ligne("chape", "Plus-value pompage : tuyau de plus de 50 m ou étage", "forfait", 1, grille.plusValuePompageDifficile));

  if (options.poncage) {
    const libelle = input.config.liant === "sulfate_calcium" ? "Élimination de la pellicule de surface (raclage ou ponçage) et aspiration" : "Ponçage et aspiration";
    lignes.push(ligne("finition", libelle, "m²", q.surfaceM2, grille.prixPoncageM2));
  }
  if (options.mesureCM) lignes.push(ligne("finition", "Mesure d'humidité résiduelle (bombe au carbure), par prélèvement", "u", 2, grille.prixMesureCM));

  lignes.push(ligne("finition", "Gestion et évacuation des déchets de chantier", "forfait", 1, grille.forfaitDechets));

  for (const libre of input.lignesLibres ?? []) {
    lignes.push(ligne(libre.lot, libre.designation, libre.unite, libre.quantite, libre.prixUnitaireHT));
  }

  let totalHT = arrondi2(lignes.reduce((s, l) => s + l.montantHT, 0));
  let minimumApplique = false;
  if (totalHT > 0 && totalHT < grille.minimumFacturation) {
    lignes.push(ligne("chape", "Complément au minimum de facturation", "forfait", 1, grille.minimumFacturation - totalHT));
    totalHT = grille.minimumFacturation;
    minimumApplique = true;
  }

  const parTauxMap = new Map<TauxTVA, number>();
  for (const l of lignes) parTauxMap.set(l.tauxTVA, (parTauxMap.get(l.tauxTVA) ?? 0) + l.montantHT);
  const parTaux = [...parTauxMap.entries()].map(([t, base]) => ({ taux: t, baseHT: arrondi2(base), tva: arrondi2((base * t) / 100) }));
  const tva = arrondi2(parTaux.reduce((s, p) => s + p.tva, 0));

  const alertes: Alerte[] = [...controlerEpaisseurs(input.pieces, input.config)];
  for (const ev of evaluerJoints(input.pieces, input.config)) {
    if (ev.necessaire) {
      alertes.push({
        code: "joints_fractionnement",
        severite: "attention",
        message: `${ev.piece.nom} : fractionnement nécessaire (${ev.motifs.join(", ")}).`,
        reference: ev.seuils.reference,
      });
    }
  }
  if (q.resteDerniereToupieM3 >= 1 && q.nombreToupies > 0) {
    alertes.push({
      code: "derniere_toupie",
      severite: "info",
      message: `La dernière toupie ne sera remplie qu'à ${Math.round(((q.volumeCommandeM3 % (input.parametres?.capaciteToupieM3 ?? 7)) / (input.parametres?.capaciteToupieM3 ?? 7)) * 100)} % : ${q.resteDerniereToupieM3} m³ de reste.`,
    });
  }
  if (input.fiscal.sousTraitance && input.fiscal.typeClient !== "particulier" && (input.fiscal.natureTravaux === "amelioration" || input.fiscal.natureTravaux === "renovation_energetique")) {
    alertes.push({
      code: "taux_reduit_sous_traitance",
      severite: "info",
      message: "Le taux réduit ne s'applique pas à la facture d'un sous-traitant : facture hors taxe, TVA autoliquidée par le donneur d'ordre.",
      reference: "BOI-TVA-LIQ-30-20-90-40 § 20",
    });
  }

  return {
    quantites: q,
    lignes,
    totaux: { totalHT, tva, totalTTC: arrondi2(totalHT + tva), parTaux, minimumApplique },
    regime,
    alertes,
  };
}
