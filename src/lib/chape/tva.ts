/**
 * Régime de TVA et mentions obligatoires d'un devis ou d'une facture de travaux.
 *
 * Sources (état au 28 octobre 2026) :
 * - taux réduits : CGI art. 279-0 bis (10 %) et 278-0 bis A (5,5 %) ; BOI-TVA-LIQ-30-20-90-40 ;
 * - mention de certification remplaçant l'attestation : loi n° 2025-127 du 14 février 2025, art. 41 ;
 * - autoliquidation en sous-traitance : CGI art. 283-2 nonies ;
 * - mentions de facture : Code de commerce L441-9, CGI ann. II art. 242 nonies A ;
 * - contrat hors établissement : Code de la consommation L221-18 et suivants.
 */

export type TypeClient = "particulier" | "professionnel" | "collectivite";
export type NatureTravaux = "neuf" | "amelioration" | "renovation_energetique";

export interface ContexteFiscal {
  typeClient: TypeClient;
  /** L'entreprise intervient comme sous-traitant d'un assujetti (loi de 1975). */
  sousTraitance: boolean;
  /** Le local est un logement (habitation). */
  habitation: boolean;
  /** Logement achevé depuis plus de 2 ans. */
  logementPlusDe2Ans: boolean;
  natureTravaux: NatureTravaux;
  /** Devis signé hors établissement (au domicile du client). */
  horsEtablissement: boolean;
}

export type TauxTVA = 0 | 5.5 | 10 | 20;

export interface RegimeTVA {
  taux: TauxTVA;
  autoliquidation: boolean;
  /** Mentions à imprimer sur le devis et la facture. */
  mentions: string[];
  /** Explication du taux retenu. */
  motif: string;
  /** Délai de rétractation applicable, en jours (0 si aucun). */
  retractationJours: number;
  /** Indemnité forfaitaire de recouvrement due par un client professionnel, en €. */
  indemniteRecouvrement: number;
}

export const MENTION_AUTOLIQUIDATION = "Autoliquidation de la TVA par le preneur (CGI, art. 283-2 nonies).";

export const MENTION_CERTIFICATION_10 =
  "Par la signature du présent document, le client certifie que les travaux portent sur un local à usage d'habitation achevé depuis plus de deux ans et remplissent les conditions du taux réduit de 10 % (CGI, art. 279-0 bis).";

export const MENTION_CERTIFICATION_5_5 =
  "Par la signature du présent document, le client certifie que les travaux portent sur un local à usage d'habitation achevé depuis plus de deux ans et remplissent les conditions du taux réduit de 5,5 % (CGI, art. 278-0 bis A).";

export const MENTION_RETRACTATION =
  "Contrat conclu hors établissement : le client dispose d'un délai de rétractation de 14 jours à compter du lendemain de la signature (Code de la consommation, art. L221-18). Aucun paiement ne peut être exigé avant 7 jours.";

export const MENTION_PENALITES_PRO =
  "Pénalités de retard : trois fois le taux d'intérêt légal. Indemnité forfaitaire pour frais de recouvrement : 40 € (Code de commerce, art. L441-10 et D441-5).";

export const MENTION_MEDIATEUR =
  "En cas de litige, le client consommateur peut recourir gratuitement au médiateur de la consommation dont relève l'entreprise (coordonnées en pied de page).";

export function determinerRegimeTVA(ctx: ContexteFiscal): RegimeTVA {
  const mentions: string[] = [];
  const particulier = ctx.typeClient === "particulier";

  if (ctx.sousTraitance && !particulier) {
    mentions.push(MENTION_AUTOLIQUIDATION, MENTION_PENALITES_PRO);
    return {
      taux: 0,
      autoliquidation: true,
      mentions,
      motif: "Sous-traitance de travaux immobiliers : facture hors taxe, TVA autoliquidée par le donneur d'ordre.",
      retractationJours: 0,
      indemniteRecouvrement: 40,
    };
  }

  let taux: TauxTVA = 20;
  let motif = "Taux normal.";
  if (ctx.habitation && ctx.logementPlusDe2Ans && ctx.natureTravaux === "renovation_energetique") {
    taux = 5.5;
    motif = "Travaux de rénovation énergétique dans un logement de plus de 2 ans.";
    mentions.push(MENTION_CERTIFICATION_5_5);
  } else if (ctx.habitation && ctx.logementPlusDe2Ans && ctx.natureTravaux === "amelioration") {
    taux = 10;
    motif = "Travaux d'amélioration, de transformation ou d'aménagement dans un logement de plus de 2 ans.";
    mentions.push(MENTION_CERTIFICATION_10);
  } else if (ctx.natureTravaux === "neuf") {
    motif = "Construction neuve : taux normal.";
  } else if (!ctx.habitation) {
    motif = "Local non affecté à l'habitation : taux normal.";
  } else {
    motif = "Logement de moins de 2 ans : taux normal.";
  }

  let retractationJours = 0;
  if (particulier && ctx.horsEtablissement) {
    retractationJours = 14;
    mentions.push(MENTION_RETRACTATION);
  }
  if (particulier) mentions.push(MENTION_MEDIATEUR);
  if (!particulier) mentions.push(MENTION_PENALITES_PRO);

  return {
    taux,
    autoliquidation: false,
    mentions,
    motif,
    retractationJours,
    indemniteRecouvrement: particulier ? 0 : 40,
  };
}

/** Plafond légal du délai de paiement entre professionnels : 60 jours date de facture ou 45 jours fin de mois. */
export function delaiPaiementAdmissible(jours: number, finDeMois: boolean): boolean {
  return finDeMois ? jours <= 45 : jours <= 60;
}

/** Retenue de garantie : 5 % au plus du marché (loi n° 71-584 du 16 juillet 1971). */
export const RETENUE_GARANTIE_MAX = 0.05;
