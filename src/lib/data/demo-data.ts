import { GRILLE_DEMO } from "@/lib/chape/devis";
import type {
  Centrale,
  Chantier,
  Client,
  Controle,
  Devis,
  DocumentEntreprise,
  Entreprise,
  Equipe,
  Facture,
  Indisponibilite,
  LivraisonBon,
  Materiel,
  Membre,
  Message,
  Pointage,
  Produit,
  RendezVous,
} from "@/lib/domain/types";

/**
 * Jeu de données du mode démo : une entreprise fictive de chapistes de la région lyonnaise,
 * avec des clients, devis et chantiers réalistes. Les produits reprennent le référentiel QB46 / DTA.
 */

export const DEMO_ENTREPRISE_ID = "demo-entreprise";

const jours = (n: number) => {
  const d = new Date();
  d.setHours(8, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString();
};
const jour = (n: number) => jours(n).slice(0, 10);

export const demoEntreprise: Entreprise = {
  id: DEMO_ENTREPRISE_ID,
  nom: "Rhône Chapes Fluides",
  siren: "912 345 678",
  tvaIntracom: "FR 12 912345678",
  adresse: "14 rue des Frères Lumière",
  codePostal: "69680",
  ville: "Chassieu",
  telephone: "04 72 00 00 00",
  email: "contact@rhone-chapes.fr",
  assureurDecennale: "SMABTP",
  numeroContratDecennale: "DEC-2026-48213",
  zoneCouvertureDecennale: "France métropolitaine",
  attestationDecennaleExpireLe: jour(220),
  mediateurConsommation: "Médiateur de la consommation CNPM, 27 avenue de la Libération, 42400 Saint-Chamond",
  formule: "equipe",
  tauxPertes: 0.05,
  grilleTarifaire: GRILLE_DEMO,
  depotLat: 45.7441,
  depotLng: 4.9711,
  coutHoraireDefaut: 26,
};

export const demoEquipes: Equipe[] = [
  { id: "eq-1", entrepriseId: DEMO_ENTREPRISE_ID, nom: "Équipe 1", couleur: "#13836d", chefId: "m-chef-1", capaciteM2Jour: 300 },
  { id: "eq-2", entrepriseId: DEMO_ENTREPRISE_ID, nom: "Équipe 2", couleur: "#b45309", chefId: "m-chef-2", capaciteM2Jour: 250 },
];

export const demoMembres: Membre[] = [
  { id: "m-gerant", entrepriseId: DEMO_ENTREPRISE_ID, nom: "Thibault Rey", email: "demo@tousenchape.fr", telephone: "06 00 00 00 01", role: "gerant", typeContrat: "gerant", dateEntree: "2015-03-01", actif: true, habilitations: [{ id: "h-g1", type: "carte_btp", numero: "BTP-0001", dateFin: jour(400) }, { id: "h-g2", type: "permis_be" }] },
  { id: "m-bureau", entrepriseId: DEMO_ENTREPRISE_ID, nom: "Sophie Martin", email: "sophie@rhone-chapes.fr", telephone: "04 72 00 00 01", role: "bureau", typeContrat: "cdi", dateEntree: "2019-09-02", actif: true, habilitations: [] },
  { id: "m-chef-1", entrepriseId: DEMO_ENTREPRISE_ID, nom: "Karim Benali", email: "karim@rhone-chapes.fr", telephone: "06 00 00 00 02", role: "chef_equipe", equipeId: "eq-1", typeContrat: "cdi", dateEntree: "2017-04-10", cqpNumero: "CH-2024-0871", cqpDate: "2024-06-12", actif: true, matricule: "0003", coutHoraire: 32, habilitations: [{ id: "h-k1", type: "carte_btp", numero: "BTP-0002", dateFin: jour(700) }, { id: "h-k2", type: "pompe_chape" }, { id: "h-k3", type: "sst", dateFin: jour(25) }, { id: "h-k4", type: "permis_be" }, { id: "h-k5", type: "visite_medicale", dateFin: jour(300) }] },
  { id: "m-chef-2", entrepriseId: DEMO_ENTREPRISE_ID, nom: "Lucas Perrin", email: "lucas@rhone-chapes.fr", telephone: "06 00 00 00 03", role: "chef_equipe", equipeId: "eq-2", typeContrat: "cdi", dateEntree: "2021-02-15", actif: true, matricule: "0004", coutHoraire: 29, notes: "CQP chapiste : session prévue au printemps.", habilitations: [{ id: "h-l1", type: "carte_btp", numero: "BTP-0003", dateFin: jour(900) }, { id: "h-l2", type: "pompe_chape" }, { id: "h-l3", type: "permis_b" }, { id: "h-l4", type: "visite_medicale", dateFin: jour(-12) }] },
  { id: "m-app-1", entrepriseId: DEMO_ENTREPRISE_ID, nom: "Mehdi Saïdi", email: "mehdi@rhone-chapes.fr", telephone: "06 00 00 00 04", role: "applicateur", equipeId: "eq-1", typeContrat: "cdi", dateEntree: "2022-06-01", actif: true, matricule: "0005", coutHoraire: 25, habilitations: [{ id: "h-m1", type: "carte_btp", numero: "BTP-0004", dateFin: jour(1200) }, { id: "h-m2", type: "permis_b" }, { id: "h-m3", type: "aipr", dateFin: jour(48) }] },
  { id: "m-app-2", entrepriseId: DEMO_ENTREPRISE_ID, nom: "Antoine Garcia", email: "antoine@rhone-chapes.fr", telephone: "06 00 00 00 05", role: "applicateur", equipeId: "eq-2", typeContrat: "apprenti", dateEntree: "2025-09-01", actif: true, matricule: "0006", coutHoraire: 14, habilitations: [{ id: "h-a1", type: "carte_btp", numero: "BTP-0005", dateFin: jour(1500) }] },
  { id: "m-app-3", entrepriseId: DEMO_ENTREPRISE_ID, nom: "Yanis Kone", email: "yanis@rhone-chapes.fr", telephone: "06 00 00 00 06", role: "applicateur", equipeId: "eq-2", typeContrat: "cdd", dateEntree: "2026-03-02", actif: true, matricule: "0007", coutHoraire: 24, habilitations: [{ id: "h-y1", type: "carte_btp", numero: "BTP-0006", dateFin: jour(1600) }, { id: "h-y2", type: "permis_b" }] },
];

export const demoIndisponibilites: Indisponibilite[] = [
  { id: "ind-1", entrepriseId: DEMO_ENTREPRISE_ID, membreId: "m-app-1", debut: jour(3), fin: jour(7), motif: "conge", commentaire: "Congés posés en septembre", createdAt: jours(-20) },
  { id: "ind-2", entrepriseId: DEMO_ENTREPRISE_ID, membreId: "m-chef-2", debut: jour(6), fin: jour(6), motif: "formation", commentaire: "Session CQP chapiste", createdAt: jours(-15) },
];

export const demoMessages: Message[] = [
  { id: "msg-1", entrepriseId: DEMO_ENTREPRISE_ID, chantierId: "ch-1", auteurId: "m-chef-1", texte: "Visite faite, isolant jointif, piges réglées. Il manque 2 ml de bande périphérique côté garage, je repasse demain matin avant le camion.", signalement: false, createdAt: jours(-10) },
  { id: "msg-2", entrepriseId: DEMO_ENTREPRISE_ID, chantierId: "ch-1", auteurId: "m-bureau", texte: "Bande commandée, livrée au dépôt ce soir.", signalement: false, createdAt: jours(-10).replace("T08:00", "T14:30") },
  { id: "msg-3", entrepriseId: DEMO_ENTREPRISE_ID, chantierId: "ch-1", auteurId: "m-chef-1", texte: "Deuxième toupie arrivée à 23 cm d'étalement, 15 l/m³ ajoutés dans la plage. Coulage terminé 11 h 20, 150 m².", signalement: false, createdAt: jours(-9).replace("T08:00", "T11:25") },
  { id: "msg-4", entrepriseId: DEMO_ENTREPRISE_ID, chantierId: "ch-2", auteurId: "m-chef-1", texte: "Le portail de la cour fait 3,20 m : la toupie de 8 m³ ne passera pas, prévoir une 6 m³ ou pomper depuis la rue (60 m).", signalement: true, createdAt: jours(-1).replace("T08:00", "T16:40") },
];

export const demoClients: Client[] = [
  { id: "c-1", entrepriseId: DEMO_ENTREPRISE_ID, type: "professionnel", nom: "Maisons Alpha Constructions", siren: "523 456 789", email: "chantiers@maisons-alpha.fr", telephone: "04 78 11 22 33", adresse: "ZA des Platanes", codePostal: "69960", ville: "Corbas", conditionsPaiementJours: 45, createdAt: jours(-400) },
  { id: "c-2", entrepriseId: DEMO_ENTREPRISE_ID, type: "particulier", nom: "M. et Mme Durand", email: "p.durand@example.fr", telephone: "06 12 34 56 78", adresse: "8 impasse des Cerisiers", codePostal: "69380", ville: "Lissieu", conditionsPaiementJours: 30, createdAt: jours(-20) },
  { id: "c-3", entrepriseId: DEMO_ENTREPRISE_ID, type: "professionnel", nom: "Bâti Rhône SAS", siren: "398 765 432", email: "compta@batirhone.fr", telephone: "04 72 55 66 77", adresse: "120 avenue Berthelot", codePostal: "69007", ville: "Lyon", conditionsPaiementJours: 45, createdAt: jours(-300) },
  { id: "c-4", entrepriseId: DEMO_ENTREPRISE_ID, type: "collectivite", nom: "Commune de Genas", siren: "216 900 779", email: "services.techniques@genas.fr", adresse: "Place du Général de Gaulle", codePostal: "69740", ville: "Genas", conditionsPaiementJours: 30, createdAt: jours(-90) },
  { id: "c-5", entrepriseId: DEMO_ENTREPRISE_ID, type: "particulier", nom: "Mme Nguyen", email: "l.nguyen@example.fr", telephone: "06 98 76 54 32", adresse: "3 chemin du Lavoir", codePostal: "69570", ville: "Dardilly", conditionsPaiementJours: 30, createdAt: jours(-6) },
];

export const demoCentrales: Centrale[] = [
  { id: "ce-1", entrepriseId: DEMO_ENTREPRISE_ID, nom: "Centrale Anhydritec Saint-Priest", ville: "Saint-Priest", capaciteToupieM3: 7, canalCommande: "email", email: "commandes.stpriest@example.fr", delaiCommandeHeures: 48 },
  { id: "ce-2", entrepriseId: DEMO_ENTREPRISE_ID, nom: "Cemex Lyon Sud", ville: "Vénissieux", capaciteToupieM3: 8, canalCommande: "portail", urlPortail: "https://www.cemex.fr/go", delaiCommandeHeures: 24 },
];

export const demoProduits: Produit[] = [
  { id: "p-classic", entrepriseId: null, centraleId: "ce-1", nom: "La Chape Liquide Classic", fabricant: "Anhydritec", liant: "sulfate_calcium", classe: "C20-F4", etalementMinCm: 24, etalementMaxCm: 28, eauMaxLParM3: 50, tempsUtilisationMin: 180, masseVolumiqueKgM3: 2000, miseEnChauffeJoursMin: 7, certificatQB46: "DTA 13/14-1244", prixM3: 118, sourceUrl: "https://www.anhydritec.fr/uploads/Document/dta-13-14-1244_v1-la-chape-liquide-classic.pdf" },
  { id: "p-thermio", entrepriseId: null, centraleId: "ce-1", nom: "Thermio Max", fabricant: "Anhydritec", liant: "sulfate_calcium", classe: "C30-F8", etalementMinCm: 24, etalementMaxCm: 27, eauMaxLParM3: 35, tempsUtilisationMin: 180, masseVolumiqueKgM3: 2050, miseEnChauffeJoursMin: 5, certificatQB46: "DTA 13/20-1467", prixM3: 139, sourceUrl: "https://www.anhydritec.fr/uploads/Document/dta-13_20-1467_v4---la_chape_liquide_thermio_max.pdf" },
  { id: "p-syntichape", entrepriseId: null, nom: "Syntichape", fabricant: "Sika", liant: "sulfate_calcium", classe: "C20-F4", etalementMinCm: 24, etalementMaxCm: 28, eauMaxLParM3: 20, tempsUtilisationMin: 180, masseVolumiqueKgM3: 2000, miseEnChauffeJoursMin: 7, certificatQB46: "QB46", sourceUrl: "https://fra.sika.com/dam/dms/fr01/l/fr-doc-avis-tech-syntichape.pdf" },
  { id: "p-viscochape", entrepriseId: null, centraleId: "ce-2", nom: "Viscochape", fabricant: "Sika", liant: "ciment", classe: "C20-F4", etalementMinCm: 22, etalementMaxCm: 28, eauMaxLParM3: 10, tempsUtilisationMin: 150, masseVolumiqueKgM3: 2100, miseEnChauffeJoursMin: 7, certificatQB46: "QB46", prixM3: 124, sourceUrl: "https://fra.sika.com/dam/dms/fr01/0/fr-doc-avis-tech-viscochape.pdf" },
  { id: "p-levelchape", entrepriseId: null, nom: "Levelchape HCS", fabricant: "Sika", liant: "ciment", classe: "C16-F3", etalementMinCm: 22, etalementMaxCm: 26, eauMaxLParM3: 10, tempsUtilisationMin: 150, masseVolumiqueKgM3: 2100, miseEnChauffeJoursMin: 7, certificatQB46: "QB46", sourceUrl: "https://fra.sika.com/dam/dms/fr01/1/fr-doc-avis-tech-levelchape-hcs.pdf" },
  { id: "p-vicat-hpc", entrepriseId: null, nom: "La Chape Vicat HPC", fabricant: "Vicat", liant: "ciment", classe: "C16-F4", etalementMinCm: 22, etalementMaxCm: 28, eauMaxLParM3: 10, tempsUtilisationMin: 120, masseVolumiqueKgM3: 2100, miseEnChauffeJoursMin: 7, sourceUrl: "https://www.chape-vicat.fr/produit/la-chape-vicat-hpc" },
];

const annee = new Date().getFullYear();

export const demoDevis: Devis[] = [
  {
    id: "d-1",
    entrepriseId: DEMO_ENTREPRISE_ID,
    clientId: "c-2",
    produitId: "p-thermio",
    numero: `DEV-${annee}-0041`,
    version: 1,
    statut: "envoye",
    objet: "Chape fluide anhydrite sur plancher chauffant, rez-de-chaussée",
    adresseChantier: "8 impasse des Cerisiers",
    codePostalChantier: "69380",
    villeChantier: "Lissieu",
    configuration: {
      liant: "sulfate_calcium",
      classe: "C30-F8",
      modePose: "flottante",
      classeIsolant: "SC1",
      classeLocal: "P2",
      plancherChauffant: { type: "eau_A", diametreTubeMm: 16 },
      revetement: "carrelage",
    },
    pieces: [
      { id: "pi-1", nom: "Séjour / cuisine", surfaceM2: 48, perimetreMl: 28, epaisseurCm: 5.5, longueurMaxM: 8.5 },
      { id: "pi-2", nom: "Chambre 1", surfaceM2: 13, perimetreMl: 14.6, epaisseurCm: 5.5, longueurMaxM: 4.2 },
      { id: "pi-3", nom: "Chambre 2", surfaceM2: 11.5, perimetreMl: 13.8, epaisseurCm: 5.5, longueurMaxM: 4 },
      { id: "pi-4", nom: "Salle de bains", surfaceM2: 6.2, perimetreMl: 10.2, epaisseurCm: 5.5, longueurMaxM: 3.1, poteaux: 1 },
      { id: "pi-5", nom: "Entrée / dégagement", surfaceM2: 9.3, perimetreMl: 16, epaisseurCm: 5.5, longueurMaxM: 6 },
    ],
    options: { film: true, bandePeripherique: true, poncage: true, primaire: false, isolant: false, mesureCM: false, joursCoulage: 1, distanceDepotKm: 24, pompageDifficile: false },
    lignesLibres: [],
    contexteFiscal: { typeClient: "particulier", sousTraitance: false, habitation: true, logementPlusDe2Ans: true, natureTravaux: "amelioration", horsEtablissement: true },
    dateValidite: jour(25),
    envoyeLe: jours(-5),
    createdAt: jours(-6),
    updatedAt: jours(-5),
  },
  {
    id: "d-2",
    entrepriseId: DEMO_ENTREPRISE_ID,
    clientId: "c-1",
    produitId: "p-classic",
    numero: `DEV-${annee}-0038`,
    version: 2,
    statut: "signe",
    objet: "Lot chape fluide, maison individuelle lot 12 — Les Jardins de Corbas",
    adresseChantier: "Lot 12, Les Jardins de Corbas",
    codePostalChantier: "69960",
    villeChantier: "Corbas",
    configuration: {
      liant: "sulfate_calcium",
      classe: "C20-F4",
      modePose: "flottante",
      classeIsolant: "SC1",
      classeLocal: "P2",
      plancherChauffant: { type: "eau_A", diametreTubeMm: 16 },
      revetement: "carrelage",
    },
    pieces: [
      { id: "pi-6", nom: "RDC complet", surfaceM2: 92, perimetreMl: 68, epaisseurCm: 6, longueurMaxM: 11.5, poteaux: 2 },
      { id: "pi-7", nom: "Étage", surfaceM2: 58, perimetreMl: 52, epaisseurCm: 5, longueurMaxM: 9 },
    ],
    options: { film: true, bandePeripherique: true, poncage: true, primaire: false, isolant: false, mesureCM: true, joursCoulage: 1, distanceDepotKm: 12, pompageDifficile: true },
    lignesLibres: [],
    contexteFiscal: { typeClient: "professionnel", sousTraitance: true, habitation: true, logementPlusDe2Ans: false, natureTravaux: "neuf", horsEtablissement: false },
    dateValidite: jour(-10),
    envoyeLe: jours(-30),
    signeLe: jours(-22),
    signatureNom: "J. Moreau, conducteur de travaux",
    createdAt: jours(-33),
    updatedAt: jours(-22),
  },
  {
    id: "d-3",
    entrepriseId: DEMO_ENTREPRISE_ID,
    clientId: "c-3",
    produitId: "p-viscochape",
    numero: `DEV-${annee}-0042`,
    version: 1,
    statut: "brouillon",
    objet: "Chape ciment, plateau de bureaux 2e étage",
    adresseChantier: "120 avenue Berthelot",
    codePostalChantier: "69007",
    villeChantier: "Lyon",
    configuration: {
      liant: "ciment",
      classe: "C20-F4",
      modePose: "desolidarisee",
      support: "beton",
      classeLocal: "P3",
      plancherChauffant: { type: "aucun" },
      revetement: "pvc",
      retraitEngageUmParM: 400,
    },
    pieces: [
      { id: "pi-8", nom: "Open space", surfaceM2: 210, perimetreMl: 62, epaisseurCm: 5, longueurMaxM: 21, poteaux: 4 },
      { id: "pi-9", nom: "Salles de réunion", surfaceM2: 46, perimetreMl: 34, epaisseurCm: 5, longueurMaxM: 7 },
    ],
    options: { film: true, bandePeripherique: true, poncage: true, primaire: false, isolant: false, mesureCM: true, joursCoulage: 1, distanceDepotKm: 18, pompageDifficile: true },
    lignesLibres: [],
    contexteFiscal: { typeClient: "professionnel", sousTraitance: true, habitation: false, logementPlusDe2Ans: false, natureTravaux: "amelioration", horsEtablissement: false },
    dateValidite: jour(30),
    createdAt: jours(-1),
    updatedAt: jours(-1),
  },
  {
    id: "d-4",
    entrepriseId: DEMO_ENTREPRISE_ID,
    clientId: "c-5",
    produitId: "p-classic",
    numero: `DEV-${annee}-0043`,
    version: 1,
    statut: "brouillon",
    objet: "Chape anhydrite, rénovation rez-de-jardin",
    adresseChantier: "3 chemin du Lavoir",
    codePostalChantier: "69570",
    villeChantier: "Dardilly",
    configuration: {
      liant: "sulfate_calcium",
      classe: "C20-F4",
      modePose: "desolidarisee",
      support: "beton",
      classeLocal: "P2",
      plancherChauffant: { type: "aucun" },
      revetement: "parquet",
    },
    pieces: [
      { id: "pi-10", nom: "Pièce de vie", surfaceM2: 34, perimetreMl: 24, epaisseurCm: 2, longueurMaxM: 7 },
      { id: "pi-11", nom: "Bureau", surfaceM2: 9, perimetreMl: 12, epaisseurCm: 3, longueurMaxM: 3.5 },
    ],
    options: { film: true, bandePeripherique: true, poncage: true, primaire: false, isolant: false, mesureCM: false, joursCoulage: 1, distanceDepotKm: 21, pompageDifficile: false },
    lignesLibres: [],
    contexteFiscal: { typeClient: "particulier", sousTraitance: false, habitation: true, logementPlusDe2Ans: true, natureTravaux: "amelioration", horsEtablissement: true },
    dateValidite: jour(30),
    createdAt: jours(0),
    updatedAt: jours(0),
  },
];

export const demoChantiers: Chantier[] = [
  {
    id: "ch-1",
    entrepriseId: DEMO_ENTREPRISE_ID,
    devisId: "d-2",
    clientId: "c-1",
    produitId: "p-classic",
    centraleId: "ce-1",
    equipeId: "eq-1",
    chefEquipeId: "m-chef-1",
    surfacePrevueM2: 150,
    materielIds: ["mat-pompe-1", "mat-laser-1"],
    latitude: 45.6686,
    longitude: 4.9015,
    numero: `CH-${annee}-0019`,
    statut: "sechage",
    adresse: "Lot 12, Les Jardins de Corbas",
    codePostal: "69960",
    ville: "Corbas",
    accesCamion: "Accès par la rue du Stade, portail de 4 m, stationnement toupie possible devant la parcelle.",
    distancePompageM: 35,
    etage: 1,
    dateCoulage: jour(-9),
    heurePremierCamion: "07:30",
    heureDebutCoulage: jours(-9).replace("T08:00", "T07:45"),
    heureFinCoulage: jours(-9).replace("T08:00", "T11:20"),
    surfaceCouleeM2: 150,
    natureSupport: "Isolant PU 80 mm sur dalle béton, plancher chauffant type A, tube 16 mm",
    classementUPEC: "P2",
    temperatureC: 14,
    createdAt: jours(-22),
    updatedAt: jours(-9),
  },
  {
    id: "ch-2",
    entrepriseId: DEMO_ENTREPRISE_ID,
    clientId: "c-4",
    produitId: "p-viscochape",
    centraleId: "ce-2",
    equipeId: "eq-1",
    chefEquipeId: "m-chef-1",
    surfacePrevueM2: 210,
    numero: `CH-${annee}-0020`,
    statut: "pret",
    adresse: "École Jean Jaurès, 2 rue de la République",
    codePostal: "69740",
    ville: "Genas",
    accesCamion: "Cour de l'école, accès par le parking du personnel.",
    distancePompageM: 60,
    etage: 0,
    dateCoulage: jour(2),
    heurePremierCamion: "07:00",
    natureSupport: "Dalle béton existante, film polyéthylène 200 µm",
    classementUPEC: "P3",
    createdAt: jours(-15),
    updatedAt: jours(-1),
  },
  {
    id: "ch-3",
    entrepriseId: DEMO_ENTREPRISE_ID,
    clientId: "c-3",
    produitId: "p-classic",
    centraleId: "ce-1",
    equipeId: "eq-2",
    chefEquipeId: "m-chef-2",
    surfacePrevueM2: 320,
    renforts: [{ nom: "Intérimaire Manpower", origine: "Agence Vénissieux" }],
    numero: `CH-${annee}-0021`,
    statut: "planifie",
    adresse: "Résidence Les Terrasses, bât. B",
    codePostal: "69500",
    ville: "Bron",
    distancePompageM: 80,
    etage: 3,
    dateCoulage: jour(6),
    heurePremierCamion: "07:30",
    natureSupport: "Sous-couche acoustique SC2, plancher chauffant type A",
    classementUPEC: "P2",
    createdAt: jours(-10),
    updatedAt: jours(-3),
  },
];

export const demoLivraisons: LivraisonBon[] = [
  { id: "l-1", chantierId: "ch-1", numeroBon: "BL-784512", uniteProduction: "Anhydritec Saint-Priest", heureFabrication: jours(-9).replace("T08:00", "T06:40"), heureArrivee: jours(-9).replace("T08:00", "T07:35"), heureFinDechargement: jours(-9).replace("T08:00", "T08:25"), volumeM3: 7, etalementDepartCm: 27, etalementChantierCm: 26, eauAjouteeLParM3: 0, alertes: [], signeParId: "m-chef-1", createdAt: jours(-9) },
  { id: "l-2", chantierId: "ch-1", numeroBon: "BL-784519", uniteProduction: "Anhydritec Saint-Priest", heureFabrication: jours(-9).replace("T08:00", "T08:10"), heureArrivee: jours(-9).replace("T08:00", "T09:05"), heureFinDechargement: jours(-9).replace("T08:00", "T09:50"), volumeM3: 2.3, etalementDepartCm: 27, etalementChantierCm: 23, eauAjouteeLParM3: 15, alertes: [{ code: "etalement_hors_plage", severite: "attention", message: "Étalement de 23 cm hors de la plage 24 à 28 cm du produit La Chape Liquide Classic.", reference: "Certificat QB46 (DTA 13/14-1244)" }], signeParId: "m-chef-1", createdAt: jours(-9) },
];

export const demoControles: Controle[] = [
  {
    id: "co-1",
    chantierId: "ch-1",
    type: "visite_technique",
    reponses: { clos_couvert: "oui", courants_air: "oui", cloisons: "oui", support_propre: "oui", isolant_jointif: "oui", film: "oui", bande: "oui", piges: "oui", zones_prelevement: "oui" },
    mesures: [{ type: "temperature", valeur: 14, unite: "°C", conforme: true }],
    conforme: true,
    auteurId: "m-chef-1",
    createdAt: jours(-10),
  },
  {
    id: "co-2",
    chantierId: "ch-1",
    type: "coulage",
    reponses: { etalement_controle: "oui", piges_affleurees: "oui", passes_croisees: "oui" },
    mesures: [
      { type: "epaisseur", valeur: 6, unite: "cm", conforme: true, commentaire: "RDC, pige centrale" },
      { type: "epaisseur", valeur: 5.1, unite: "cm", conforme: true, commentaire: "Étage, chambre 2" },
    ],
    conforme: true,
    auteurId: "m-chef-1",
    createdAt: jours(-9),
  },
];

export const demoFactures: Facture[] = [
  {
    id: "f-1",
    entrepriseId: DEMO_ENTREPRISE_ID,
    clientId: "c-1",
    devisId: "d-2",
    chantierId: "ch-1",
    numero: `FA-${annee}-0027`,
    type: "acompte",
    statut: "payee",
    dateEmission: jour(-21),
    dateEcheance: jour(-21 + 45),
    lignes: [{ lot: "chape", designation: "Acompte de 30 % sur devis DEV-" + annee + "-0038 v2", unite: "forfait", quantite: 1, prixUnitaireHT: 2190, montantHT: 2190, tauxTVA: 0 }],
    totalHT: 2190,
    tva: 0,
    totalTTC: 2190,
    retenueGarantie: 0,
    autoliquidation: true,
    mentions: ["Autoliquidation de la TVA par le preneur (CGI, art. 283-2 nonies)."],
    paiements: [{ id: "pa-1", montant: 2190, datePaiement: jour(-12), moyen: "Virement" }],
    createdAt: jours(-21),
  },
  {
    id: "f-2",
    entrepriseId: DEMO_ENTREPRISE_ID,
    clientId: "c-3",
    numero: `FA-${annee}-0026`,
    type: "solde",
    statut: "en_retard",
    dateEmission: jour(-70),
    dateEcheance: jour(-25),
    lignes: [{ lot: "chape", designation: "Solde chantier CH-" + annee + "-0015, chape ciment 180 m²", unite: "forfait", quantite: 1, prixUnitaireHT: 4860, montantHT: 4860, tauxTVA: 0 }],
    totalHT: 4860,
    tva: 0,
    totalTTC: 4860,
    retenueGarantie: 243,
    autoliquidation: true,
    mentions: ["Autoliquidation de la TVA par le preneur (CGI, art. 283-2 nonies)."],
    paiements: [],
    createdAt: jours(-70),
  },
];

/** Pointages validés sur le chantier de Corbas (coulé il y a 9 jours) et pointages de la semaine en attente. */
function pointageDemo(id: string, membreId: string, chantierId: string | undefined, j: number, debut: string, fin: string | undefined, statut: Pointage["statut"], zone: number, patch: Partial<Pointage> = {}): Pointage {
  const date = jour(j);
  return { id, entrepriseId: DEMO_ENTREPRISE_ID, membreId, chantierId, date, debut: `${date}T${debut}:00`, fin: fin ? `${date}T${fin}:00` : undefined, pauseMin: 45, type: "chantier", zoneTrajet: zone, panier: true, grandDeplacement: false, statut, createdAt: jours(j), ...patch };
}

export const demoPointages: Pointage[] = [
  // Visite technique de Corbas (J-10), puis coulage (J-9), équipe 1.
  pointageDemo("pt-1", "m-chef-1", "ch-1", -10, "13:30", "15:00", "valide_bureau", 2, { pauseMin: 0, panier: false, latDebut: 45.6686, lngDebut: 4.9015, ecartChantierKm: 0.1 }),
  pointageDemo("pt-2", "m-chef-1", "ch-1", -9, "06:45", "15:30", "valide_bureau", 2, { latDebut: 45.6686, lngDebut: 4.9015, ecartChantierKm: 0.1 }),
  pointageDemo("pt-3", "m-app-1", "ch-1", -9, "06:45", "15:30", "valide_bureau", 2, { latDebut: 45.6688, lngDebut: 4.9012, ecartChantierKm: 0.1 }),
  // Semaine précédente, équipe 1 au dépôt et sur un chantier terminé.
  pointageDemo("pt-4", "m-chef-1", undefined, -8, "07:30", "16:30", "valide_bureau", null as unknown as number, { type: "depot", zoneTrajet: null, panier: false }),
  pointageDemo("pt-5", "m-app-1", undefined, -8, "07:30", "16:30", "valide_bureau", null as unknown as number, { type: "depot", zoneTrajet: null, panier: false }),
  // Cette semaine : saisis par l'équipe, à valider par le chef puis le bureau.
  pointageDemo("pt-6", "m-app-1", undefined, -1, "07:30", "16:45", "saisi", 1, { type: "depot", commentaire: "Préparation du matériel pour Genas" }),
  pointageDemo("pt-7", "m-chef-1", undefined, -1, "07:00", "17:00", "valide_chef", 1, { type: "depot" }),
  pointageDemo("pt-8", "m-chef-2", "ch-3", -1, "08:00", "12:00", "saisi", 3, { type: "chantier", panier: false, commentaire: "Visite technique Bron, bât. B", ecartChantierKm: 0.2 }),
  pointageDemo("pt-9", "m-app-2", undefined, -1, "07:30", "16:30", "saisi", 1, { type: "depot" }),
];

export const demoMateriels: Materiel[] = [
  { id: "mat-pompe-1", entrepriseId: DEMO_ENTREPRISE_ID, type: "pompe", nom: "Pompe à chape Lancy TF400", numeroSerie: "TF4-2021-118", dateAchat: "2021-05-12", equipeId: "eq-1", actif: true, controles: [{ id: "cm-1", type: "vgp", libelle: "Vérification générale périodique", dateFait: jour(-300), prochaineDate: jour(65) }, { id: "cm-2", type: "entretien", libelle: "Vidange et joints de la trémie", dateFait: jour(-40), prochaineDate: jour(140) }] },
  { id: "mat-pompe-2", entrepriseId: DEMO_ENTREPRISE_ID, type: "pompe", nom: "Pompe à chape Lancy TF300", numeroSerie: "TF3-2018-402", dateAchat: "2018-03-02", equipeId: "eq-2", actif: true, controles: [{ id: "cm-3", type: "vgp", libelle: "Vérification générale périodique", dateFait: jour(-380), prochaineDate: jour(-15) }] },
  { id: "mat-camion-1", entrepriseId: DEMO_ENTREPRISE_ID, type: "camion", nom: "Camion plateau Iveco Daily", immatriculation: "GH-123-RC", dateAchat: "2022-09-01", equipeId: "eq-1", actif: true, controles: [{ id: "cm-4", type: "controle_technique", dateFait: jour(-200), prochaineDate: jour(165) }] },
  { id: "mat-camion-2", entrepriseId: DEMO_ENTREPRISE_ID, type: "camion", nom: "Fourgon Renault Master", immatriculation: "FK-456-RC", dateAchat: "2020-01-15", equipeId: "eq-2", actif: true, controles: [{ id: "cm-5", type: "controle_technique", dateFait: jour(-700), prochaineDate: jour(20) }] },
  { id: "mat-laser-1", entrepriseId: DEMO_ENTREPRISE_ID, type: "laser", nom: "Niveau laser Leica Rugby 640", numeroSerie: "LR-77812", equipeId: "eq-1", actif: true, controles: [{ id: "cm-6", type: "etalonnage", dateFait: jour(-100), prochaineDate: jour(265) }] },
  { id: "mat-laser-2", entrepriseId: DEMO_ENTREPRISE_ID, type: "laser", nom: "Niveau laser Bosch GRL 300", equipeId: "eq-2", actif: true, controles: [] },
  { id: "mat-cm-1", entrepriseId: DEMO_ENTREPRISE_ID, type: "bombe_cm", nom: "Bombe à carbure CM Gann", numeroSerie: "CM-5531", actif: true, controles: [{ id: "cm-7", type: "etalonnage", libelle: "Vérification du manomètre", dateFait: jour(-20), prochaineDate: jour(345) }] },
];

export const demoRendezVous: RendezVous[] = [
  { id: "rv-1", entrepriseId: DEMO_ENTREPRISE_ID, type: "visite_technique", date: jour(1), heure: "14:00", dureeMin: 60, chantierId: "ch-3", clientId: "c-3", membreId: "m-chef-2", adresse: "Résidence Les Terrasses, bât. B, 69500 Bron", notes: "Vérifier la sous-couche acoustique et les zones de prélèvement.", createdAt: jours(-3) },
  { id: "rv-2", entrepriseId: DEMO_ENTREPRISE_ID, type: "metre", date: jour(2), heure: "09:30", dureeMin: 45, clientId: "c-5", membreId: "m-bureau", adresse: "3 chemin du Lavoir, 69570 Dardilly", notes: "Métré du rez-de-jardin pour le devis DEV-0043.", createdAt: jours(-2) },
  { id: "rv-3", entrepriseId: DEMO_ENTREPRISE_ID, type: "rdv_client", date: jour(4), heure: "11:00", dureeMin: 30, clientId: "c-1", membreId: "m-gerant", adresse: "ZA des Platanes, 69960 Corbas", notes: "Point trimestriel avec le conducteur de travaux, lots 13 à 18.", createdAt: jours(-1) },
];

export const demoDocuments: DocumentEntreprise[] = [
  { id: "doc-1", entrepriseId: DEMO_ENTREPRISE_ID, type: "kbis", nom: "Extrait Kbis", dateFin: jour(70), createdAt: jours(-20) },
  { id: "doc-2", entrepriseId: DEMO_ENTREPRISE_ID, type: "urssaf", nom: "Attestation de vigilance URSSAF", dateFin: jour(18), createdAt: jours(-160) },
  { id: "doc-3", entrepriseId: DEMO_ENTREPRISE_ID, type: "decennale", nom: "Attestation d'assurance décennale SMABTP", dateFin: jour(220), createdAt: jours(-100) },
  { id: "doc-4", entrepriseId: DEMO_ENTREPRISE_ID, type: "rc_pro", nom: "Attestation RC professionnelle", dateFin: jour(220), createdAt: jours(-100) },
  { id: "doc-5", entrepriseId: DEMO_ENTREPRISE_ID, type: "liste_salaries", nom: "Liste nominative des salariés étrangers", dateFin: jour(-5), createdAt: jours(-200) },
  { id: "doc-6", entrepriseId: DEMO_ENTREPRISE_ID, type: "rib", nom: "RIB", createdAt: jours(-400) },
];
