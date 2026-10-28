import { describe, expect, it } from "vitest";
import { csvVariablesPaie, distanceKm, dureeHeures, lundiDe, repartirSemaine, variablesPaieMois, zoneDepuisDistance, type PointageCalculable } from "./heures";

const p = (date: string, debut: string, fin: string, patch: Partial<PointageCalculable> = {}): PointageCalculable => ({
  membreId: "m",
  date,
  debut: `${date}T${debut}:00`,
  fin: `${date}T${fin}:00`,
  pauseMin: 30,
  type: "chantier",
  zoneTrajet: 2,
  panier: true,
  grandDeplacement: false,
  statut: "valide_bureau",
  ...patch,
});

describe("dureeHeures", () => {
  it("déduit la pause et arrondit au centième", () => {
    expect(dureeHeures({ debut: "2027-03-01T07:30:00", fin: "2027-03-01T16:45:00", pauseMin: 45 })).toBe(8.5);
  });
  it("vaut 0 sans heure de fin", () => {
    expect(dureeHeures({ debut: "2027-03-01T07:30:00", pauseMin: 0 })).toBe(0);
  });
});

describe("lundiDe", () => {
  it("trouve le lundi, y compris pour un dimanche", () => {
    expect(lundiDe("2027-03-03")).toBe("2027-03-01");
    expect(lundiDe("2027-03-07")).toBe("2027-03-01");
    expect(lundiDe("2027-03-01")).toBe("2027-03-01");
  });
});

describe("repartirSemaine", () => {
  it("35 h normales, 25 % de la 36e à la 43e, 50 % au-delà", () => {
    expect(repartirSemaine(32)).toEqual({ normales: 32, sup25: 0, sup50: 0 });
    expect(repartirSemaine(39)).toEqual({ normales: 35, sup25: 4, sup50: 0 });
    expect(repartirSemaine(46)).toEqual({ normales: 35, sup25: 8, sup50: 3 });
  });
});

describe("variablesPaieMois", () => {
  it("compte une semaine de 5 jours de 8,5 h avec paniers et trajets zone 2", () => {
    const pointages = ["2027-03-01", "2027-03-02", "2027-03-03", "2027-03-04", "2027-03-05"].map((d) => p(d, "07:30", "16:30"));
    const v = variablesPaieMois("m", "2027-03", pointages);
    expect(v.joursTravailles).toBe(5);
    expect(v.heures).toBe(42.5);
    expect(v.normales).toBe(35);
    expect(v.sup25).toBe(7.5);
    expect(v.sup50).toBe(0);
    expect(v.paniers).toBe(5);
    expect(v.trajetsParZone).toEqual({ 2: 5 });
    // 5 × 11 + 5 × 12,4 = 117
    expect(v.indemnitesEuros).toBe(117);
    expect(v.enAttente).toBe(0);
  });

  it("ignore les pointages non validés par le bureau et les compte en attente", () => {
    const pointages = [p("2027-03-01", "07:30", "16:30"), p("2027-03-02", "07:30", "16:30", { statut: "valide_chef" }), p("2027-03-03", "07:30", "16:30", { statut: "refuse" })];
    const v = variablesPaieMois("m", "2027-03", pointages);
    expect(v.joursTravailles).toBe(1);
    expect(v.enAttente).toBe(1);
  });

  it("un seul panier et une seule zone (la plus élevée) par journée, même avec deux pointages", () => {
    const pointages = [p("2027-03-01", "07:30", "12:00", { zoneTrajet: 1 }), p("2027-03-01", "13:00", "17:00", { zoneTrajet: 3 })];
    const v = variablesPaieMois("m", "2027-03", pointages);
    expect(v.paniers).toBe(1);
    expect(v.trajetsParZone).toEqual({ 3: 1 });
    expect(v.heures).toBe(7.5);
  });

  it("un grand déplacement remplace le trajet", () => {
    const v = variablesPaieMois("m", "2027-03", [p("2027-03-01", "07:00", "18:00", { grandDeplacement: true })]);
    expect(v.grandsDeplacements).toBe(1);
    expect(v.trajetsParZone).toEqual({});
    // panier 11 + GD 95
    expect(v.indemnitesEuros).toBe(106);
  });

  it("rattache une semaine à cheval au mois de son lundi", () => {
    // Lundi 29 mars 2027, jeudi 1er avril.
    const v = variablesPaieMois("m", "2027-04", [p("2027-03-29", "08:00", "17:00"), p("2027-04-01", "08:00", "17:00")]);
    expect(v.heures).toBe(0);
    expect(v.joursTravailles).toBe(1);
    const mars = variablesPaieMois("m", "2027-03", [p("2027-03-29", "08:00", "17:00"), p("2027-04-01", "08:00", "17:00")]);
    expect(mars.heures).toBe(17);
  });

  it("n'inclut pas les pointages d'un autre salarié", () => {
    expect(variablesPaieMois("autre", "2027-03", [p("2027-03-01", "08:00", "17:00")]).heures).toBe(0);
  });
});

describe("csvVariablesPaie", () => {
  it("écrit un CSV à point-virgule avec décimales à la virgule", () => {
    const v = variablesPaieMois("m", "2027-03", [p("2027-03-01", "07:30", "16:30")]);
    const csv = csvVariablesPaie([{ nom: "Karim Benali", matricule: "0042", v }]);
    const lignes = csv.split("\r\n");
    expect(lignes).toHaveLength(2);
    expect(lignes[0]?.startsWith("Matricule;Nom;Mois")).toBe(true);
    expect(lignes[1]).toBe("0042;Karim Benali;2027-03;1;8,50;8,50;0,00;0,00;1;0;1;0;0;0;0;23,40;0");
  });
});

describe("zones et distances", () => {
  it("découpe les zones par tranches de 10 km, 5 au plus", () => {
    expect(zoneDepuisDistance(0)).toBeNull();
    expect(zoneDepuisDistance(4)).toBe(1);
    expect(zoneDepuisDistance(10)).toBe(1);
    expect(zoneDepuisDistance(10.1)).toBe(2);
    expect(zoneDepuisDistance(80)).toBe(5);
  });
  it("mesure Chassieu → Lyon Part-Dieu à environ 10 km", () => {
    const d = distanceKm({ lat: 45.7441, lng: 4.9711 }, { lat: 45.7606, lng: 4.8596 });
    expect(d).toBeGreaterThan(8);
    expect(d).toBeLessThan(10.5);
  });
});
