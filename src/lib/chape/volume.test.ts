import { describe, expect, it } from "vitest";
import type { Piece } from "./types";
import { calculerQuantites, chargeKgParM2, epaisseurPourToupiePleine } from "./volume";

const maison: Piece[] = [
  { id: "1", nom: "Séjour", surfaceM2: 45, perimetreMl: 27, epaisseurCm: 5 },
  { id: "2", nom: "Chambre 1", surfaceM2: 12, perimetreMl: 14, epaisseurCm: 5 },
  { id: "3", nom: "Chambre 2", surfaceM2: 11, perimetreMl: 13.4, epaisseurCm: 5 },
  { id: "4", nom: "Salle de bains", surfaceM2: 6, perimetreMl: 10, epaisseurCm: 5, poteaux: 1 },
];

describe("calculerQuantites", () => {
  it("calcule le volume avec 5 % de pertes et arrondit les toupies au supérieur", () => {
    const q = calculerQuantites(maison);
    expect(q.surfaceM2).toBe(74);
    expect(q.volumeTheoriqueM3).toBe(3.7);
    expect(q.volumeCommandeM3).toBe(3.89);
    expect(q.nombreToupies).toBe(1);
    expect(q.resteDerniereToupieM3).toBe(3.11);
    expect(q.epaisseurMoyenneCm).toBe(5);
  });

  it("passe à deux toupies dès que le volume dépasse la capacité", () => {
    const grande = [{ id: "1", nom: "Plateau", surfaceM2: 150, perimetreMl: 50, epaisseurCm: 5 }];
    const q = calculerQuantites(grande, { capaciteToupieM3: 7 });
    expect(q.volumeCommandeM3).toBe(7.88);
    expect(q.nombreToupies).toBe(2);
    expect(q.resteDerniereToupieM3).toBe(6.12);
  });

  it("ne compte pas de toupie pour un volume qui tombe exactement sur un multiple", () => {
    const exact = [{ id: "1", nom: "Hall", surfaceM2: 140, perimetreMl: 48, epaisseurCm: 5 }];
    // 7 m³ théoriques × 1,0 = 7 m³ : une toupie pleine.
    const q = calculerQuantites(exact, { capaciteToupieM3: 7, tauxPertes: 0 });
    expect(q.nombreToupies).toBe(1);
    expect(q.resteDerniereToupieM3).toBe(0);
  });

  it("compte le film avec 10 % de recouvrement et la remontée périphérique", () => {
    const q = calculerQuantites([{ id: "1", nom: "A", surfaceM2: 100, perimetreMl: 40, epaisseurCm: 5 }]);
    // 100 × 1,10 + 40 × (0,05 + 0,10) = 110 + 6 = 116
    expect(q.filmM2).toBe(116);
  });

  it("compte la bande périphérique avec les poteaux", () => {
    const q = calculerQuantites(maison);
    // 27 + 14 + 13,4 + 10 + 1 poteau × 1,2 = 65,6
    expect(q.bandePeripheriqueMl).toBe(65.6);
  });

  it("pondère l'épaisseur moyenne par la surface", () => {
    const q = calculerQuantites([
      { id: "1", nom: "A", surfaceM2: 30, perimetreMl: 22, epaisseurCm: 4 },
      { id: "2", nom: "B", surfaceM2: 10, perimetreMl: 13, epaisseurCm: 8 },
    ]);
    expect(q.epaisseurMoyenneCm).toBe(5);
  });

  it("retourne des zéros sans pièce", () => {
    const q = calculerQuantites([]);
    expect(q.nombreToupies).toBe(0);
    expect(q.epaisseurMoyenneCm).toBe(0);
  });

  it("refuse une capacité de toupie nulle", () => {
    expect(() => calculerQuantites(maison, { capaciteToupieM3: 0 })).toThrow();
  });
});

describe("chargeKgParM2", () => {
  it("donne 20 kg/m² par cm à 2 000 kg/m³", () => {
    expect(chargeKgParM2(5)).toBe(100);
    expect(chargeKgParM2(4, 2200)).toBe(88);
  });
});

describe("epaisseurPourToupiePleine", () => {
  it("propose l'épaisseur qui remplit la dernière toupie", () => {
    const q = calculerQuantites(maison);
    // 7 m³ / 1,05 = 6,667 m³ sur 74 m² → 9,0 cm
    expect(epaisseurPourToupiePleine(q, 7, 0.05)).toBe(9);
  });

  it("ne propose rien quand la toupie est quasi pleine", () => {
    const q = calculerQuantites([{ id: "1", nom: "A", surfaceM2: 133, perimetreMl: 46, epaisseurCm: 5 }]);
    expect(q.resteDerniereToupieM3).toBeLessThan(0.2);
    expect(epaisseurPourToupiePleine(q, 7, 0.05)).toBeNull();
  });
});
