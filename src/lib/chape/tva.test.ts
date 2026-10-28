import { describe, expect, it } from "vitest";
import {
  MENTION_AUTOLIQUIDATION,
  MENTION_CERTIFICATION_10,
  MENTION_CERTIFICATION_5_5,
  MENTION_MEDIATEUR,
  MENTION_PENALITES_PRO,
  MENTION_RETRACTATION,
  delaiPaiementAdmissible,
  determinerRegimeTVA,
  type ContexteFiscal,
} from "./tva";

const particulierRenov: ContexteFiscal = {
  typeClient: "particulier",
  sousTraitance: false,
  habitation: true,
  logementPlusDe2Ans: true,
  natureTravaux: "amelioration",
  horsEtablissement: true,
};

describe("determinerRegimeTVA", () => {
  it("particulier, logement de plus de 2 ans, amélioration : 10 % avec mention de certification", () => {
    const r = determinerRegimeTVA(particulierRenov);
    expect(r.taux).toBe(10);
    expect(r.autoliquidation).toBe(false);
    expect(r.mentions).toContain(MENTION_CERTIFICATION_10);
    expect(r.mentions).toContain(MENTION_RETRACTATION);
    expect(r.mentions).toContain(MENTION_MEDIATEUR);
    expect(r.mentions).not.toContain(MENTION_PENALITES_PRO);
    expect(r.retractationJours).toBe(14);
    expect(r.indemniteRecouvrement).toBe(0);
  });

  it("rénovation énergétique : 5,5 %", () => {
    const r = determinerRegimeTVA({ ...particulierRenov, natureTravaux: "renovation_energetique" });
    expect(r.taux).toBe(5.5);
    expect(r.mentions).toContain(MENTION_CERTIFICATION_5_5);
  });

  it("devis signé en agence : pas de rétractation", () => {
    const r = determinerRegimeTVA({ ...particulierRenov, horsEtablissement: false });
    expect(r.retractationJours).toBe(0);
    expect(r.mentions).not.toContain(MENTION_RETRACTATION);
  });

  it("logement de moins de 2 ans ou construction neuve : 20 %", () => {
    expect(determinerRegimeTVA({ ...particulierRenov, logementPlusDe2Ans: false }).taux).toBe(20);
    expect(determinerRegimeTVA({ ...particulierRenov, natureTravaux: "neuf" }).taux).toBe(20);
  });

  it("local professionnel : 20 %, pénalités et indemnité de 40 €", () => {
    const r = determinerRegimeTVA({
      typeClient: "professionnel",
      sousTraitance: false,
      habitation: false,
      logementPlusDe2Ans: false,
      natureTravaux: "amelioration",
      horsEtablissement: false,
    });
    expect(r.taux).toBe(20);
    expect(r.mentions).toContain(MENTION_PENALITES_PRO);
    expect(r.indemniteRecouvrement).toBe(40);
  });

  it("sous-traitance pour un professionnel : hors taxe, autoliquidation, même en amélioration", () => {
    const r = determinerRegimeTVA({
      typeClient: "professionnel",
      sousTraitance: true,
      habitation: true,
      logementPlusDe2Ans: true,
      natureTravaux: "amelioration",
      horsEtablissement: false,
    });
    expect(r.taux).toBe(0);
    expect(r.autoliquidation).toBe(true);
    expect(r.mentions).toContain(MENTION_AUTOLIQUIDATION);
    expect(r.mentions).not.toContain(MENTION_CERTIFICATION_10);
  });

  it("un particulier ne peut pas être preneur en autoliquidation", () => {
    const r = determinerRegimeTVA({ ...particulierRenov, sousTraitance: true });
    expect(r.autoliquidation).toBe(false);
    expect(r.taux).toBe(10);
  });
});

describe("delaiPaiementAdmissible", () => {
  it("60 jours date de facture, 45 jours fin de mois", () => {
    expect(delaiPaiementAdmissible(60, false)).toBe(true);
    expect(delaiPaiementAdmissible(61, false)).toBe(false);
    expect(delaiPaiementAdmissible(45, true)).toBe(true);
    expect(delaiPaiementAdmissible(46, true)).toBe(false);
  });
});
