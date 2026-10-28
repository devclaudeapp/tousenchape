import { describe, expect, it } from "vitest";
import { CATALOGUE_HABILITATIONS, dateFinProposee, etatValidite } from "./habilitations";
import { calculerAlertes, chargeEquipeJour, indisponibleLe } from "./alertes";
import type { Chantier, Entreprise, Equipe, Facture, Indisponibilite, Membre, Message } from "./types";
import { GRILLE_DEMO } from "@/lib/chape/devis";

const aujourdHui = new Date("2027-03-01T10:00:00");

describe("etatValidite", () => {
  it("expirée hier, bientôt sous 60 jours, valide au-delà, sans échéance si absente", () => {
    expect(etatValidite("2027-02-28", aujourdHui).etat).toBe("expiree");
    expect(etatValidite("2027-04-01", aujourdHui)).toEqual({ etat: "expire_bientot", joursRestants: 31 });
    expect(etatValidite("2027-06-01", aujourdHui).etat).toBe("valide");
    expect(etatValidite(undefined, aujourdHui).etat).toBe("sans_echeance");
  });
});

describe("dateFinProposee", () => {
  it("ajoute la validité usuelle du type", () => {
    expect(dateFinProposee("carte_btp", "2025-03-10")).toBe("2030-03-10");
    expect(dateFinProposee("sst", "2025-03-10")).toBe("2027-03-10");
    expect(dateFinProposee("permis_b", "2010-01-01")).toBeUndefined();
    expect(CATALOGUE_HABILITATIONS.aipr.validiteAnnees).toBe(5);
  });
});

const entreprise = { id: "e", nom: "E", siren: "1", adresse: "", codePostal: "", ville: "", formule: "essai", tauxPertes: 0.05, grilleTarifaire: GRILLE_DEMO, attestationDecennaleExpireLe: "2027-12-31" } as Entreprise;
const membre = (patch: Partial<Membre>): Membre => ({ id: "m", entrepriseId: "e", nom: "Karim", email: "k@e.fr", role: "chef_equipe", habilitations: [], actif: true, ...patch });
const chantier = (patch: Partial<Chantier>): Chantier => ({ id: "c", entrepriseId: "e", clientId: "cl", numero: "CH-1", statut: "planifie", adresse: "", codePostal: "", ville: "", createdAt: "", updatedAt: "", ...patch });

describe("calculerAlertes", () => {
  const base = { aujourdHui, entreprise, membres: [] as Membre[], equipes: [] as Equipe[], chantiers: [] as Chantier[], factures: [] as Facture[], indisponibilites: [] as Indisponibilite[], messages: [] as Message[] };

  it("ne remonte rien quand tout est en ordre", () => {
    expect(calculerAlertes(base)).toEqual([]);
  });

  it("signale une habilitation expirée et une autre à renouveler", () => {
    const m = membre({ habilitations: [{ id: "h1", type: "carte_btp", dateFin: "2027-01-15" }, { id: "h2", type: "sst", dateFin: "2027-04-10" }, { id: "h3", type: "permis_b" }] });
    const codes = calculerAlertes({ ...base, membres: [m] }).map((a) => a.code);
    expect(codes).toEqual(["hab_expiree_m_h1", "hab_bientot_m_h2"]);
  });

  it("ignore les compagnons inactifs", () => {
    const m = membre({ actif: false, habilitations: [{ id: "h1", type: "carte_btp", dateFin: "2027-01-15" }] });
    expect(calculerAlertes({ ...base, membres: [m] })).toEqual([]);
  });

  it("chantier planifié : chef absent, sans CQP, visite manquante à J-2", () => {
    const chef = membre({ id: "chef", cqpNumero: undefined });
    const c = chantier({ dateCoulage: "2027-03-03", chefEquipeId: "chef" });
    const indispo: Indisponibilite = { id: "i", entrepriseId: "e", membreId: "chef", debut: "2027-03-02", fin: "2027-03-05", motif: "conge", createdAt: "" };
    const alertes = calculerAlertes({ ...base, membres: [chef], chantiers: [c], indisponibilites: [indispo] });
    const codes = alertes.map((a) => a.code);
    expect(codes).toContain("sans_cqp_c");
    expect(codes).toContain("chef_absent_c");
    expect(codes).toContain("visite_manquante_c");
    expect(alertes[0]?.niveau).toBe("urgent");
  });

  it("facture en retard de plus de 30 jours : urgent", () => {
    const f = { id: "f", entrepriseId: "e", clientId: "cl", numero: "FA-1", type: "solde", statut: "emise", dateEmission: "2027-01-01", dateEcheance: "2027-01-20", lignes: [], totalHT: 100, tva: 0, totalTTC: 100, retenueGarantie: 0, autoliquidation: true, mentions: [], paiements: [], createdAt: "" } as Facture;
    const [a] = calculerAlertes({ ...base, factures: [f] });
    expect(a).toMatchObject({ code: "facture_retard_f", niveau: "urgent" });
    expect(a?.titre).toContain("40 jours");
  });

  it("signalement non traité : urgent, traité : rien", () => {
    const msg: Message = { id: "x", entrepriseId: "e", chantierId: "c", auteurId: "m", texte: "Fuite sur le tuyau", signalement: true, createdAt: "" };
    expect(calculerAlertes({ ...base, messages: [msg] })[0]?.code).toBe("signalement_x");
    expect(calculerAlertes({ ...base, messages: [{ ...msg, traiteLe: "2027-03-01" }] })).toEqual([]);
  });
});

describe("indisponibleLe et chargeEquipeJour", () => {
  it("bornes incluses", () => {
    const i: Indisponibilite = { id: "i", entrepriseId: "e", membreId: "m", debut: "2027-03-02", fin: "2027-03-04", motif: "conge", createdAt: "" };
    expect(indisponibleLe([i], "m", "2027-03-02")).toBeDefined();
    expect(indisponibleLe([i], "m", "2027-03-04")).toBeDefined();
    expect(indisponibleLe([i], "m", "2027-03-05")).toBeUndefined();
  });
  it("somme les surfaces prévues d'une équipe un jour donné", () => {
    const cs = [
      chantier({ id: "1", equipeId: "eq", dateCoulage: "2027-03-02", surfacePrevueM2: 120 }),
      chantier({ id: "2", equipeId: "eq", dateCoulage: "2027-03-02", surfaceCouleeM2: 80 }),
      chantier({ id: "3", equipeId: "autre", dateCoulage: "2027-03-02", surfacePrevueM2: 500 }),
      chantier({ id: "4", equipeId: "eq", dateCoulage: "2027-03-03", surfacePrevueM2: 500 }),
    ];
    expect(chargeEquipeJour(cs, "eq", "2027-03-02")).toBe(200);
  });
});
