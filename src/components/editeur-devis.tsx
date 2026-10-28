"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { chiffrerDevis, type Lot } from "@/lib/chape/devis";
import { limitesEpaisseur } from "@/lib/chape/epaisseurs";
import { epaisseurPourToupiePleine } from "@/lib/chape/volume";
import type { ClasseResistance, ConfigurationChape, Piece, Revetement } from "@/lib/chape/types";
import type { Client, Entreprise, Produit } from "@/lib/domain/types";
import type { EtatDevis } from "@/app/app/devis/actions";
import type { DonneesDevis } from "@/lib/domain/schema-devis";
import { fmtEuros, fmtNombre, libelleRevetement } from "@/lib/format";
import { ListeAlertes } from "./ui";

const LOTS: Record<Lot, string> = { preparation: "Préparation", isolation: "Isolation", chape: "Chape", finition: "Finition", carrelage: "Carrelage" };
const REVETEMENTS: Revetement[] = ["carrelage", "pierre", "pvc", "linoleum", "caoutchouc", "parquet", "textile", "resine", "inconnu"];
const idLocal = () => Math.random().toString(36).slice(2, 10);

function nouvellePiece(): Piece {
  return { id: idLocal(), nom: "", surfaceM2: 0, perimetreMl: 0, epaisseurCm: 5 };
}

export function EditeurDevis({
  action,
  clients,
  produits,
  entreprise,
  initial,
  clientInitial,
}: {
  action: (etat: EtatDevis, formData: FormData) => Promise<EtatDevis>;
  clients: Client[];
  produits: Produit[];
  entreprise: Entreprise;
  initial?: DonneesDevis;
  clientInitial?: string;
}) {
  const [etat, soumettre, enCours] = useActionState(action, undefined);
  const [donnees, setDonnees] = useState<DonneesDevis>(() =>
    initial ?? {
      clientId: clientInitial ?? "",
      produitId: produits[0]?.id ?? "",
      objet: "",
      adresseChantier: "",
      codePostalChantier: "",
      villeChantier: "",
      configuration: {
        liant: produits[0]?.liant ?? "sulfate_calcium",
        classe: produits[0]?.classe ?? "C20-F4",
        modePose: "flottante",
        classeIsolant: "SC1",
        classeLocal: "P2",
        plancherChauffant: { type: "eau_A", diametreTubeMm: 16 },
        revetement: "carrelage",
      },
      pieces: [{ ...nouvellePiece(), nom: "Séjour" }],
      options: { film: true, bandePeripherique: true, poncage: true, primaire: false, isolant: false, mesureCM: false, joursCoulage: 1, distanceDepotKm: 20, pompageDifficile: false },
      lignesLibres: [],
      contexteFiscal: { typeClient: "particulier", sousTraitance: false, habitation: true, logementPlusDe2Ans: true, natureTravaux: "amelioration", horsEtablissement: true },
      dateValidite: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    },
  );

  const client = clients.find((c) => c.id === donnees.clientId);
  const produit = produits.find((p) => p.id === donnees.produitId);

  const maj = (patch: Partial<DonneesDevis>) => setDonnees((d) => ({ ...d, ...patch }));
  const majConfig = (patch: Partial<ConfigurationChape>) => setDonnees((d) => ({ ...d, configuration: { ...d.configuration, ...patch } as DonneesDevis["configuration"] }));
  const majOptions = (patch: Partial<DonneesDevis["options"]>) => setDonnees((d) => ({ ...d, options: { ...d.options, ...patch } }));
  const majFiscal = (patch: Partial<DonneesDevis["contexteFiscal"]>) => setDonnees((d) => ({ ...d, contexteFiscal: { ...d.contexteFiscal, ...patch } }));
  const majPiece = (id: string, patch: Partial<Piece>) => setDonnees((d) => ({ ...d, pieces: d.pieces.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));

  const choisirClient = (id: string) => {
    const c = clients.find((x) => x.id === id);
    maj({ clientId: id });
    if (c) {
      majFiscal({
        typeClient: c.type,
        sousTraitance: c.type === "professionnel" ? donnees.contexteFiscal.sousTraitance : false,
        horsEtablissement: c.type === "particulier",
      });
      if (!donnees.adresseChantier && c.adresse) maj({ clientId: id, adresseChantier: c.adresse, codePostalChantier: c.codePostal ?? "", villeChantier: c.ville ?? "" });
    }
  };

  const choisirProduit = (id: string) => {
    const p = produits.find((x) => x.id === id);
    maj({ produitId: id });
    if (p) majConfig({ liant: p.liant, classe: p.classe as ClasseResistance, modePose: p.liant === "sulfate_calcium" && donnees.configuration.modePose === "adherente" ? "desolidarisee" : donnees.configuration.modePose });
  };

  const resultat = useMemo(() => {
    const grille = produit?.prixM3 ? { ...entreprise.grilleTarifaire, prixMortierM3: produit.prixM3 } : entreprise.grilleTarifaire;
    const piecesValides = donnees.pieces.filter((p) => p.surfaceM2 > 0 && p.epaisseurCm > 0).map((p) => ({ ...p, nom: p.nom || "Pièce" }));
    return chiffrerDevis({
      pieces: piecesValides,
      config: donnees.configuration,
      options: donnees.options,
      lignesLibres: donnees.lignesLibres,
      grille,
      parametres: { tauxPertes: entreprise.tauxPertes },
      fiscal: donnees.contexteFiscal,
    });
  }, [donnees, produit, entreprise]);

  const limites = limitesEpaisseur(donnees.configuration);
  const suggestion = epaisseurPourToupiePleine(resultat.quantites, 7, entreprise.tauxPertes);
  const bloquant = resultat.alertes.some((a) => a.severite === "bloquant");

  return (
    <form action={soumettre} className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <input type="hidden" name="donnees" value={JSON.stringify(donnees)} />

      <div className="space-y-6">
        {/* Client et chantier */}
        <section className="carte p-5">
          <h2 className="mb-4 text-sm font-semibold text-stone-800">1. Client et chantier</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="clientId" className="etiquette">Client</label>
              <div className="flex gap-2">
                <select id="clientId" value={donnees.clientId} onChange={(e) => choisirClient(e.target.value)} className="champ" required>
                  <option value="">Choisir un client…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom} {c.ville ? `(${c.ville})` : ""}
                    </option>
                  ))}
                </select>
                <Link href="/app/clients/nouveau?suite=/app/devis/nouveau" className="bouton-secondaire shrink-0">
                  Nouveau
                </Link>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="objet" className="etiquette">Objet du devis</label>
              <input id="objet" value={donnees.objet} onChange={(e) => maj({ objet: e.target.value })} className="champ" placeholder="Chape fluide anhydrite sur plancher chauffant, rez-de-chaussée" required />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="adresseChantier" className="etiquette">Adresse du chantier</label>
              <input id="adresseChantier" value={donnees.adresseChantier} onChange={(e) => maj({ adresseChantier: e.target.value })} className="champ" />
            </div>
            <div>
              <label htmlFor="codePostalChantier" className="etiquette">Code postal</label>
              <input id="codePostalChantier" value={donnees.codePostalChantier} onChange={(e) => maj({ codePostalChantier: e.target.value })} className="champ" />
            </div>
            <div>
              <label htmlFor="villeChantier" className="etiquette">Ville</label>
              <input id="villeChantier" value={donnees.villeChantier} onChange={(e) => maj({ villeChantier: e.target.value })} className="champ" />
            </div>
          </div>
        </section>

        {/* Régime fiscal */}
        <section className="carte p-5">
          <h2 className="mb-1 text-sm font-semibold text-stone-800">2. Régime de TVA</h2>
          <p className="mb-4 text-xs text-stone-500">{resultat.regime.motif}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {client?.type !== "particulier" && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={donnees.contexteFiscal.sousTraitance} onChange={(e) => majFiscal({ sousTraitance: e.target.checked })} />
                Sous-traitance (TVA autoliquidée par le donneur d&apos;ordre)
              </label>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={donnees.contexteFiscal.habitation} onChange={(e) => majFiscal({ habitation: e.target.checked })} />
              Local à usage d&apos;habitation
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={donnees.contexteFiscal.logementPlusDe2Ans} onChange={(e) => majFiscal({ logementPlusDe2Ans: e.target.checked })} />
              Logement achevé depuis plus de 2 ans
            </label>
            {client?.type === "particulier" && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={donnees.contexteFiscal.horsEtablissement} onChange={(e) => majFiscal({ horsEtablissement: e.target.checked })} />
                Devis signé au domicile du client (rétractation 14 jours)
              </label>
            )}
            <div>
              <label htmlFor="natureTravaux" className="etiquette">Nature des travaux</label>
              <select id="natureTravaux" value={donnees.contexteFiscal.natureTravaux} onChange={(e) => majFiscal({ natureTravaux: e.target.value as DonneesDevis["contexteFiscal"]["natureTravaux"] })} className="champ">
                <option value="neuf">Construction neuve</option>
                <option value="amelioration">Amélioration, transformation, aménagement</option>
                <option value="renovation_energetique">Rénovation énergétique</option>
              </select>
            </div>
          </div>
        </section>

        {/* Technique */}
        <section className="carte p-5">
          <h2 className="mb-4 text-sm font-semibold text-stone-800">3. Produit et mode de pose</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="produitId" className="etiquette">Produit (certificat QB46 / DTA)</label>
              <select id="produitId" value={donnees.produitId} onChange={(e) => choisirProduit(e.target.value)} className="champ" required>
                {produits.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fabricant} · {p.nom} · {p.classe} · {p.liant === "sulfate_calcium" ? "anhydrite" : "ciment"}
                  </option>
                ))}
              </select>
              {produit && (
                <p className="mt-1 text-xs text-stone-500">
                  Étalement {produit.etalementMinCm} à {produit.etalementMaxCm} cm · eau max {produit.eauMaxLParM3} l/m³ · utilisation {produit.tempsUtilisationMin} min
                  {produit.prixM3 ? ` · ${fmtEuros(produit.prixM3)}/m³` : ""}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="modePose" className="etiquette">Mode de pose</label>
              <select id="modePose" value={donnees.configuration.modePose} onChange={(e) => majConfig({ modePose: e.target.value as ConfigurationChape["modePose"] })} className="champ">
                {donnees.configuration.liant === "ciment" && <option value="adherente">Adhérente</option>}
                <option value="desolidarisee">Désolidarisée sur film</option>
                <option value="flottante">Flottante sur isolant</option>
              </select>
            </div>
            {donnees.configuration.modePose === "flottante" ? (
              <div>
                <label htmlFor="classeIsolant" className="etiquette">Classe de l&apos;isolant</label>
                <select id="classeIsolant" value={donnees.configuration.classeIsolant ?? "SC1"} onChange={(e) => majConfig({ classeIsolant: e.target.value as "SC1" | "SC2" })} className="champ">
                  <option value="SC1">SC1</option>
                  <option value="SC2">SC2</option>
                </select>
              </div>
            ) : (
              <div>
                <label htmlFor="support" className="etiquette">Support</label>
                <select id="support" value={donnees.configuration.support ?? "beton"} onChange={(e) => majConfig({ support: e.target.value as ConfigurationChape["support"] })} className="champ">
                  <option value="beton">Maçonnerie, béton, dallage</option>
                  <option value="bois">Plancher bois</option>
                  <option value="ancien_revetement">Ancien revêtement</option>
                  <option value="ravoirage">Ravoirage</option>
                  <option value="asphalte">Asphalte</option>
                </select>
              </div>
            )}
            <div>
              <label htmlFor="classeLocal" className="etiquette">Classement des locaux</label>
              <select id="classeLocal" value={donnees.configuration.classeLocal} onChange={(e) => majConfig({ classeLocal: e.target.value as ConfigurationChape["classeLocal"] })} className="champ">
                <option value="P2">P2 — logement</option>
                <option value="P3">P3 — collectif, bureaux</option>
                <option value="P4">P4 — fort trafic</option>
              </select>
            </div>
            <div>
              <label htmlFor="revetement" className="etiquette">Revêtement prévu</label>
              <select id="revetement" value={donnees.configuration.revetement} onChange={(e) => majConfig({ revetement: e.target.value as Revetement })} className="champ">
                {REVETEMENTS.map((r) => (
                  <option key={r} value={r}>{libelleRevetement[r]}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="plancherChauffant" className="etiquette">Plancher chauffant</label>
              <select
                id="plancherChauffant"
                value={donnees.configuration.plancherChauffant.type}
                onChange={(e) => {
                  const t = e.target.value as ConfigurationChape["plancherChauffant"]["type"];
                  majConfig({ plancherChauffant: t === "aucun" ? { type: "aucun" } : t === "electrique" ? { type: "electrique" } : { type: t, diametreTubeMm: 16 } });
                }}
                className="champ"
              >
                <option value="aucun">Aucun</option>
                <option value="eau_A">Eau chaude, type A (tubes sur isolant)</option>
                <option value="eau_C">Eau chaude, type C (tubes enrobés, chape désolidarisée)</option>
                <option value="electrique">Rayonnant électrique</option>
              </select>
            </div>
            {(donnees.configuration.plancherChauffant.type === "eau_A" || donnees.configuration.plancherChauffant.type === "eau_C") && (
              <div>
                <label htmlFor="diametreTube" className="etiquette">Diamètre du tube (mm)</label>
                <input
                  id="diametreTube"
                  type="number"
                  min={10}
                  max={25}
                  value={donnees.configuration.plancherChauffant.diametreTubeMm}
                  onChange={(e) => majConfig({ plancherChauffant: { ...donnees.configuration.plancherChauffant, diametreTubeMm: Number(e.target.value) } as ConfigurationChape["plancherChauffant"] })}
                  className="champ"
                />
              </div>
            )}
            {donnees.configuration.liant === "ciment" && (
              <>
                <label className="flex items-center gap-2 text-sm sm:pt-6">
                  <input type="checkbox" checked={donnees.configuration.fibree ?? false} onChange={(e) => majConfig({ fibree: e.target.checked })} />
                  Chape fibrée
                </label>
                <div>
                  <label htmlFor="retrait" className="etiquette">Retrait engagé QB46 (µm/m, optionnel)</label>
                  <input id="retrait" type="number" min={100} max={1000} value={donnees.configuration.retraitEngageUmParM ?? ""} onChange={(e) => majConfig({ retraitEngageUmParM: e.target.value ? Number(e.target.value) : undefined })} className="champ" placeholder="ex. 400" />
                </div>
              </>
            )}
          </div>
          <p className="mt-4 rounded-md bg-stone-50 px-3 py-2 text-xs text-stone-600">
            Épaisseur minimale pour cette configuration : <strong>{limites.minCm} cm</strong> ({limites.regle}, {limites.reference})
            {limites.maxCm !== null && <> · maximum {limites.maxCm} cm</>}.
          </p>
        </section>

        {/* Pièces */}
        <section className="carte p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-800">4. Pièces</h2>
            <button type="button" onClick={() => maj({ pieces: [...donnees.pieces, nouvellePiece()] })} className="bouton-secondaire">
              <Plus className="h-4 w-4" aria-hidden /> Ajouter une pièce
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="tableau">
              <thead>
                <tr>
                  <th className="min-w-44">Pièce</th>
                  <th className="w-24">Surface m²</th>
                  <th className="w-24">Périmètre ml</th>
                  <th className="w-24">Épaisseur cm</th>
                  <th className="w-24">Longueur max m</th>
                  <th className="w-20">Poteaux</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {donnees.pieces.map((p) => {
                  const sousMin = p.epaisseurCm > 0 && p.epaisseurCm < limites.minCm;
                  return (
                    <tr key={p.id}>
                      <td><input value={p.nom} onChange={(e) => majPiece(p.id, { nom: e.target.value })} className="champ" placeholder="Séjour" aria-label="Nom de la pièce" /></td>
                      <td><input type="number" step="0.1" min={0} value={p.surfaceM2 || ""} onChange={(e) => majPiece(p.id, { surfaceM2: Number(e.target.value) })} className="champ" aria-label="Surface" /></td>
                      <td><input type="number" step="0.1" min={0} value={p.perimetreMl || ""} onChange={(e) => majPiece(p.id, { perimetreMl: Number(e.target.value) })} className="champ" aria-label="Périmètre" /></td>
                      <td><input type="number" step="0.5" min={0} value={p.epaisseurCm || ""} onChange={(e) => majPiece(p.id, { epaisseurCm: Number(e.target.value) })} className={`champ ${sousMin ? "border-rose-400 bg-rose-50" : ""}`} aria-label="Épaisseur" /></td>
                      <td><input type="number" step="0.1" min={0} value={p.longueurMaxM ?? ""} onChange={(e) => majPiece(p.id, { longueurMaxM: e.target.value ? Number(e.target.value) : undefined })} className="champ" aria-label="Longueur maximale" /></td>
                      <td><input type="number" min={0} value={p.poteaux ?? ""} onChange={(e) => majPiece(p.id, { poteaux: e.target.value ? Number(e.target.value) : undefined })} className="champ" aria-label="Poteaux" /></td>
                      <td>
                        <button type="button" onClick={() => maj({ pieces: donnees.pieces.filter((x) => x.id !== p.id) })} className="bouton-discret p-2" aria-label="Supprimer la pièce" disabled={donnees.pieces.length === 1}>
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Options */}
        <section className="carte p-5">
          <h2 className="mb-4 text-sm font-semibold text-stone-800">5. Fournitures et options</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["film", "Film polyéthylène"],
                ["bandePeripherique", "Bande périphérique"],
                ["poncage", donnees.configuration.liant === "sulfate_calcium" ? "Élimination de la pellicule (raclage ou ponçage)" : "Ponçage"],
                ["primaire", "Primaire d'accrochage"],
                ["isolant", "Fourniture et pose de l'isolant"],
                ["mesureCM", "Mesure d'humidité CM (2 prélèvements)"],
                ["pompageDifficile", "Pompage difficile (tuyau > 50 m ou étage)"],
              ] as const
            ).map(([cle, label]) => (
              <label key={cle} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={donnees.options[cle]} onChange={(e) => majOptions({ [cle]: e.target.checked })} />
                {label}
              </label>
            ))}
            <div>
              <label htmlFor="joursCoulage" className="etiquette">Jours de coulage</label>
              <input id="joursCoulage" type="number" min={1} value={donnees.options.joursCoulage} onChange={(e) => majOptions({ joursCoulage: Number(e.target.value) })} className="champ" />
            </div>
            <div>
              <label htmlFor="distanceDepotKm" className="etiquette">Distance depuis le dépôt (km)</label>
              <input id="distanceDepotKm" type="number" min={0} value={donnees.options.distanceDepotKm} onChange={(e) => majOptions({ distanceDepotKm: Number(e.target.value) })} className="champ" />
            </div>
          </div>
        </section>

        {/* Lignes libres */}
        <section className="carte p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-800">6. Autres lots (ravoirage, carrelage…)</h2>
            <button type="button" onClick={() => maj({ lignesLibres: [...donnees.lignesLibres, { lot: "carrelage", designation: "", unite: "m²", quantite: resultat.quantites.surfaceM2, prixUnitaireHT: 0 }] })} className="bouton-secondaire">
              <Plus className="h-4 w-4" aria-hidden /> Ajouter une ligne
            </button>
          </div>
          {donnees.lignesLibres.length === 0 ? (
            <p className="text-sm text-stone-500">Aucune ligne supplémentaire.</p>
          ) : (
            <div className="space-y-2">
              {donnees.lignesLibres.map((l, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[120px_1fr_80px_90px_110px_40px]">
                  <select value={l.lot} onChange={(e) => maj({ lignesLibres: donnees.lignesLibres.map((x, j) => (j === i ? { ...x, lot: e.target.value as Lot } : x)) })} className="champ" aria-label="Lot">
                    {Object.entries(LOTS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                  <input value={l.designation} onChange={(e) => maj({ lignesLibres: donnees.lignesLibres.map((x, j) => (j === i ? { ...x, designation: e.target.value } : x)) })} className="champ" placeholder="Désignation" aria-label="Désignation" />
                  <select value={l.unite} onChange={(e) => maj({ lignesLibres: donnees.lignesLibres.map((x, j) => (j === i ? { ...x, unite: e.target.value as typeof l.unite } : x)) })} className="champ" aria-label="Unité">
                    {["m²", "m³", "ml", "forfait", "u", "jour"].map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  <input type="number" step="0.01" min={0} value={l.quantite} onChange={(e) => maj({ lignesLibres: donnees.lignesLibres.map((x, j) => (j === i ? { ...x, quantite: Number(e.target.value) } : x)) })} className="champ" aria-label="Quantité" />
                  <input type="number" step="0.01" min={0} value={l.prixUnitaireHT} onChange={(e) => maj({ lignesLibres: donnees.lignesLibres.map((x, j) => (j === i ? { ...x, prixUnitaireHT: Number(e.target.value) } : x)) })} className="champ" aria-label="Prix unitaire HT" placeholder="€ HT" />
                  <button type="button" onClick={() => maj({ lignesLibres: donnees.lignesLibres.filter((_, j) => j !== i) })} className="bouton-discret p-2" aria-label="Supprimer la ligne">
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="carte p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="dateValidite" className="etiquette">Devis valable jusqu&apos;au</label>
              <input id="dateValidite" type="date" value={donnees.dateValidite} onChange={(e) => maj({ dateValidite: e.target.value })} className="champ" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="notes" className="etiquette">Notes internes</label>
              <textarea id="notes" rows={2} value={donnees.notes ?? ""} onChange={(e) => maj({ notes: e.target.value })} className="champ" />
            </div>
          </div>
        </section>
      </div>

      {/* Récapitulatif en direct */}
      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <div className="carte p-5">
          <h2 className="text-sm font-semibold text-stone-800">Quantités</h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-stone-500">Surface</dt>
            <dd className="text-right tabular-nums">{fmtNombre(resultat.quantites.surfaceM2)} m²</dd>
            <dt className="text-stone-500">Épaisseur moyenne</dt>
            <dd className="text-right tabular-nums">{fmtNombre(resultat.quantites.epaisseurMoyenneCm)} cm</dd>
            <dt className="text-stone-500">Volume (pertes {Math.round(entreprise.tauxPertes * 100)} %)</dt>
            <dd className="text-right tabular-nums">{fmtNombre(resultat.quantites.volumeCommandeM3)} m³</dd>
            <dt className="text-stone-500">Toupies de 7 m³</dt>
            <dd className="text-right tabular-nums">
              {resultat.quantites.nombreToupies}
              {resultat.quantites.resteDerniereToupieM3 > 0 && <span className="text-stone-500"> (reste {fmtNombre(resultat.quantites.resteDerniereToupieM3)} m³)</span>}
            </dd>
            <dt className="text-stone-500">Film</dt>
            <dd className="text-right tabular-nums">{fmtNombre(resultat.quantites.filmM2)} m²</dd>
            <dt className="text-stone-500">Bande périphérique</dt>
            <dd className="text-right tabular-nums">{fmtNombre(resultat.quantites.bandePeripheriqueMl)} ml</dd>
          </dl>
          {suggestion !== null && suggestion <= (limites.maxCm ?? 99) && (
            <p className="mt-3 text-xs text-stone-500">
              Pour remplir la dernière toupie : épaisseur moyenne de {fmtNombre(suggestion)} cm.
            </p>
          )}
        </div>

        <div className="carte p-5">
          <h2 className="mb-3 text-sm font-semibold text-stone-800">Contrôles</h2>
          <ListeAlertes alertes={resultat.alertes} vide="Épaisseurs et fractionnement conformes aux Règles professionnelles." />
        </div>

        <div className="carte p-5">
          <h2 className="text-sm font-semibold text-stone-800">Chiffrage</h2>
          <ul className="mt-3 divide-y divide-stone-100 text-sm">
            {resultat.lignes.map((l, i) => (
              <li key={i} className="flex justify-between gap-3 py-1.5">
                <span className="text-stone-700">
                  {l.designation}
                  <span className="block text-xs text-stone-400">
                    {fmtNombre(l.quantite)} {l.unite} × {fmtEuros(l.prixUnitaireHT)}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">{fmtEuros(l.montantHT)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-stone-200 pt-3 text-sm">
            <div className="flex justify-between">
              <dt>Total HT</dt>
              <dd className="tabular-nums">{fmtEuros(resultat.totaux.totalHT)}</dd>
            </div>
            <div className="flex justify-between text-stone-600">
              <dt>TVA {resultat.regime.autoliquidation ? "autoliquidée" : `${resultat.regime.taux} %`}</dt>
              <dd className="tabular-nums">{fmtEuros(resultat.totaux.tva)}</dd>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <dt>Total TTC</dt>
              <dd className="tabular-nums">{fmtEuros(resultat.totaux.totalTTC)}</dd>
            </div>
          </dl>
          {resultat.totaux.minimumApplique && <p className="mt-2 text-xs text-amber-700">Minimum de facturation appliqué.</p>}
        </div>

        {etat?.erreur && <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{etat.erreur}</p>}
        <button type="submit" disabled={enCours} className="bouton-primaire w-full py-2.5">
          {enCours ? "Enregistrement…" : initial ? "Enregistrer le devis" : "Créer le devis"}
        </button>
        {bloquant && <p className="text-center text-xs text-rose-700">Le devis peut être enregistré en brouillon, mais pas envoyé tant qu&apos;une épaisseur est sous le minimum.</p>}
      </aside>
    </form>
  );
}
