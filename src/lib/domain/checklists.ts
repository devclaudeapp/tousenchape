import type { Liant } from "@/lib/chape/types";

/**
 * Checklists de contrôle, d'après les Règles professionnelles 2023.
 * Un point « bloquant » non conforme empêche le passage au statut « Prêt à couler ».
 */

export interface PointControle {
  cle: string;
  libelle: string;
  reference: string;
  bloquant: boolean;
}

export const VISITE_TECHNIQUE: PointControle[] = [
  { cle: "clos_couvert", libelle: "Bâtiment clos et couvert, vitrages posés ou baies bâchées", reference: "RP § 10.1 / 11.1", bloquant: true },
  { cle: "courants_air", libelle: "Aucun courant d'air possible pendant au moins 24 h après le coulage", reference: "RP § 10.1 / 11.1", bloquant: true },
  { cle: "temperature", libelle: "Température du support et de l'air entre +5 °C et +30 °C, sans gel ni soleil direct", reference: "RP § 10.1 / 11.1", bloquant: true },
  { cle: "cloisons", libelle: "Cloisons séparatives et cloisons maçonnées (> 150 kg/ml) terminées", reference: "RP § 10.1 / 11.1", bloquant: true },
  { cle: "support_propre", libelle: "Support propre, écarts de planéité et de niveau relevés (rattrapage au-delà de 2 cm)", reference: "RP § 10.3.1 / 11.3.1", bloquant: true },
  { cle: "isolant_jointif", libelle: "Isolant posé jointif, classe SC1 ou SC2 conforme au devis, joints calfeutrés", reference: "RP § 10.3 / 11.3", bloquant: true },
  { cle: "film", libelle: "Film polyéthylène 150 à 200 µm : recouvrement de 10 cm entre lés, remontée de 10 cm au-dessus du niveau fini", reference: "RP § 10.3.5 / 11.3.5", bloquant: true },
  { cle: "bande", libelle: "Bande périphérique posée partout (parois, huisseries, poteaux), épaisseur conforme au Tableau 7", reference: "RP § 10.3.2 / 11.3.2", bloquant: true },
  { cle: "piges", libelle: "Piges réglées au laser depuis le point haut, à l'épaisseur minimale", reference: "RP § 10.3.9 / 11.3.7", bloquant: true },
  { cle: "zones_prelevement", libelle: "Plancher chauffant : zones de prélèvement sans tube repérées (rayon 10 cm minimum)", reference: "RP § 12.1.2.3", bloquant: false },
  { cle: "acces_camion", libelle: "Accès toupie et stationnement validés, distance de pompage mesurée", reference: "Organisation", bloquant: false },
];

export const PENDANT_COULAGE: PointControle[] = [
  { cle: "etalement_controle", libelle: "Étalement contrôlé à chaque toupie et noté sur le bon de livraison", reference: "RP § 10.4.1 / 11.4.1", bloquant: true },
  { cle: "piges_affleurees", libelle: "La chape affleure les piges, tuyau maintenu à 15 cm du support", reference: "RP § 10.4.3 / 11.4.3", bloquant: true },
  { cle: "passes_croisees", libelle: "Deux passes croisées à la barre de nivellement sur toute la surface", reference: "RP § 10.4.4 / 11.4.4", bloquant: true },
  { cle: "cure", libelle: "Ciment : produit de cure appliqué à l'avancement (produit et grammage notés)", reference: "RP § 10.4.5", bloquant: false },
  { cle: "fenetres_masquees", libelle: "Fenêtres masquées, local fermé à la fin du coulage pour 24 à 48 h", reference: "RP § 10.5.1 / 11.5.1", bloquant: true },
];

export function pointsCoulage(liant: Liant): PointControle[] {
  return liant === "ciment" ? PENDANT_COULAGE : PENDANT_COULAGE.filter((p) => p.cle !== "cure");
}

export const RECEPTION: PointControle[] = [
  { cle: "pellicule", libelle: "Pellicule de surface éliminée (raclage ou ponçage) et aspirée", reference: "RP § 10.5.6 / 11.5.6", bloquant: true },
  { cle: "planeite", libelle: "Planéité : 3 mm sous la règle de 2 m, 1 mm sous la règle de 20 cm", reference: "RP § 10.6 / 11.6", bloquant: true },
  { cle: "niveau", libelle: "Niveau : ± (5 + 1 × d) mm par rapport aux repères", reference: "RP § 10.7", bloquant: true },
  { cle: "fissures", libelle: "Fissures de plus de 0,3 mm traitées", reference: "RP § 10.5.5", bloquant: true },
  { cle: "joints", libelle: "Joints de fractionnement réalisés aux emplacements prévus", reference: "RP § 10.5.4 / 11.5.5", bloquant: true },
];
