import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Truck } from "lucide-react";
import { getStore } from "@/lib/auth/session";
import { jalonsApresCoulage, dateSechageEstimee, seuilHumiditeCM, nombrePrelevementsCM } from "@/lib/chape/sechage";
import { VISITE_TECHNIQUE } from "@/lib/domain/checklists";
import { construireFicheTracabilite } from "@/lib/domain/tracabilite";
import { fmtDate, fmtDateLongue, fmtEuros, fmtHeure, fmtNombre, libelleStatutChantier, libelleStatutFacture, libelleTypeFacture } from "@/lib/format";
import { Badge, Carte, Definition, EnTete, ListeAlertes, Vide } from "@/components/ui";
import { estBureau } from "@/lib/auth/roles";
import { FilChantier } from "@/components/fil-chantier";
import { ajouterLivraison, changerStatutChantier, creerFactureChantier, enregistrerVisiteTechnique, planifierChantier } from "../actions";
import { publierMessage, traiterSignalement } from "../fil-actions";

export default async function FicheChantier({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erreur?: string; visite?: string; planifier?: string }> }) {
  const { id } = await params;
  const { erreur, visite, planifier } = await searchParams;
  const { session, store } = await getStore();
  const chantier = await store.chantier(id);
  if (!chantier) notFound();
  const [client, produits, centrales, membres, livraisons, controles, factures, devis, equipes, messages] = await Promise.all([
    store.client(chantier.clientId),
    store.produits(),
    store.centrales(),
    store.membres(),
    store.livraisons(id),
    store.controles(id),
    store.factures(),
    chantier.devisId ? store.devis(chantier.devisId) : null,
    store.equipes(),
    store.messages(id),
  ]);
  const equipe = equipes.find((e) => e.id === chantier.equipeId);
  const produit = produits.find((p) => p.id === chantier.produitId) ?? null;
  const centrale = centrales.find((c) => c.id === chantier.centraleId);
  const chef = membres.find((m) => m.id === chantier.chefEquipeId) ?? null;
  const chefs = membres.filter((m) => m.role === "chef_equipe" || m.role === "gerant");
  const mesFactures = factures.filter((f) => f.chantierId === id);
  const fiche = construireFicheTracabilite({ chantier, client, entreprise: session.entreprise, produit, chef, livraisons });
  const statut = libelleStatutChantier[chantier.statut];
  const derniereVisite = controles.filter((c) => c.type === "visite_technique").at(-1);

  const dateCoulage = chantier.dateCoulage ? new Date(`${chantier.dateCoulage}T08:00:00`) : null;
  const jalons = dateCoulage && produit ? jalonsApresCoulage(dateCoulage, produit.liant, { plancherChauffant: (devis?.configuration.plancherChauffant.type ?? "aucun") !== "aucun", miseEnChauffeJoursMin: produit.miseEnChauffeJoursMin }) : [];
  const epaisseurMoyenne = devis ? devis.pieces.reduce((s, p) => s + p.surfaceM2 * p.epaisseurCm, 0) / Math.max(1, devis.pieces.reduce((s, p) => s + p.surfaceM2, 0)) : 5;
  const sechage = dateCoulage ? dateSechageEstimee(dateCoulage, epaisseurMoyenne, (devis?.configuration.plancherChauffant.type ?? "aucun") !== "aucun") : null;
  const seuilCM = produit && devis ? seuilHumiditeCM(produit.liant, devis.configuration.revetement) : null;
  const volumeLivre = livraisons.reduce((s, l) => s + l.volumeM3, 0);
  const alertesLivraisons = livraisons.flatMap((l) => l.alertes);
  const modePlanif = planifier === "1" || chantier.statut === "planifie";

  return (
    <>
      <EnTete
        titre={
          <span className="flex items-center gap-3">
            {chantier.numero}
            <Badge classe={statut.classe}>{statut.label}</Badge>
          </span>
        }
        sousTitre={
          <>
            {client ? <Link href={`/app/clients/${client.id}`} className="hover:text-brand-700">{client.nom}</Link> : "Client inconnu"} · {chantier.adresse}, {chantier.codePostal} {chantier.ville}
            {devis && (
              <>
                {" "}· devis <Link href={`/app/devis/${devis.id}`} className="hover:text-brand-700">{devis.numero}</Link>
              </>
            )}
          </>
        }
        actions={
          <>
            <a href={`/app/chantiers/${id}/tracabilite`} target="_blank" rel="noopener" className="bouton-secondaire">
              <Download className="h-4 w-4" aria-hidden /> Fiche de traçabilité
            </a>
            {chantier.statut !== "planifie" && (
              <Link href={`/app/chantiers/${id}?planifier=1`} className="bouton-secondaire">
                Planning
              </Link>
            )}
          </>
        }
      />

      {erreur && <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{erreur}</p>}

      {/* Étape courante */}
      <div className="carte mb-6 border-brand-200 bg-brand-50/60 p-4">
        {modePlanif && (
          <form action={planifierChantier.bind(null, id)} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <h2 className="text-sm font-semibold text-brand-900 sm:col-span-3 lg:col-span-4">Planifier le coulage</h2>
            <div>
              <label htmlFor="dateCoulage" className="etiquette">Date de coulage</label>
              <input id="dateCoulage" name="dateCoulage" type="date" defaultValue={chantier.dateCoulage} className="champ" />
            </div>
            <div>
              <label htmlFor="heurePremierCamion" className="etiquette">Premier camion</label>
              <input id="heurePremierCamion" name="heurePremierCamion" type="time" defaultValue={chantier.heurePremierCamion ?? "07:30"} className="champ" />
            </div>
            <div>
              <label htmlFor="equipeId" className="etiquette">Équipe</label>
              <select id="equipeId" name="equipeId" defaultValue={chantier.equipeId ?? ""} className="champ">
                <option value="">—</option>
                {equipes.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nom} · {e.capaciteM2Jour} m²/j
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="chefEquipeId" className="etiquette">Chef d&apos;équipe (CQP requis, sinon celui de l&apos;équipe)</label>
              <select id="chefEquipeId" name="chefEquipeId" defaultValue={chantier.chefEquipeId ?? ""} className="champ">
                <option value="">À affecter</option>
                {chefs.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nom} {m.cqpNumero ? `· CQP ${m.cqpNumero}` : "· sans CQP"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="centraleId" className="etiquette">Centrale</label>
              <select id="centraleId" name="centraleId" defaultValue={chantier.centraleId ?? ""} className="champ">
                <option value="">—</option>
                {centrales.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} ({c.canalCommande === "email" ? "e-mail" : "portail"})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="produitId" className="etiquette">Produit</label>
              <select id="produitId" name="produitId" defaultValue={chantier.produitId ?? ""} className="champ">
                <option value="">—</option>
                {produits.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fabricant} {p.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="distancePompageM" className="etiquette">Distance de pompage (m)</label>
              <input id="distancePompageM" name="distancePompageM" type="number" min={0} defaultValue={chantier.distancePompageM} className="champ" />
            </div>
            <div>
              <label htmlFor="etage" className="etiquette">Étage</label>
              <input id="etage" name="etage" type="number" min={0} defaultValue={chantier.etage} className="champ" />
            </div>
            <div className="sm:col-span-3 lg:col-span-4">
              <label htmlFor="natureSupport" className="etiquette">Nature du support (fiche de traçabilité)</label>
              <input id="natureSupport" name="natureSupport" defaultValue={chantier.natureSupport} className="champ" placeholder="Isolant PU 80 mm sur dalle béton, plancher chauffant type A, tube 16 mm" />
            </div>
            <div>
              <label htmlFor="renfortNom" className="etiquette">Renfort du jour (intérimaire, prêt)</label>
              <input id="renfortNom" name="renfortNom" className="champ" placeholder="Nom" />
            </div>
            <div>
              <label htmlFor="renfortOrigine" className="etiquette">Origine du renfort</label>
              <input id="renfortOrigine" name="renfortOrigine" className="champ" placeholder="Agence, autre équipe" />
            </div>
            <div className="sm:col-span-3 lg:col-span-4">
              <label htmlFor="accesCamion" className="etiquette">Accès camion</label>
              <input id="accesCamion" name="accesCamion" defaultValue={chantier.accesCamion} className="champ" placeholder="Portail de 4 m, stationnement toupie devant la parcelle" />
            </div>
            <div className="flex items-end gap-2 sm:col-span-3 lg:col-span-4">
              <button type="submit" className="bouton-primaire">Enregistrer le planning</button>
              {chantier.statut === "planifie" && (
                <Link href={`/app/chantiers/${id}?visite=1#controles`} className="bouton-secondaire">
                  Faire la visite technique
                </Link>
              )}
            </div>
          </form>
        )}

        {!modePlanif && chantier.statut === "preparation" && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-brand-900">La dernière visite technique n&apos;est pas conforme : corrigez les points bloquants puis refaites la visite.</p>
            <Link href={`/app/chantiers/${id}?visite=1#controles`} className="bouton-primaire">Refaire la visite technique</Link>
          </div>
        )}

        {!modePlanif && chantier.statut === "pret" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <form action={changerStatutChantier.bind(null, id, "coule")} className="grid gap-3 sm:grid-cols-4">
              <h2 className="text-sm font-semibold text-brand-900 sm:col-span-4">Enregistrer le coulage {dateCoulage ? `du ${fmtDateLongue(dateCoulage.toISOString())}` : ""}</h2>
              <div>
                <label htmlFor="heureDebutCoulage" className="etiquette">Début</label>
                <input id="heureDebutCoulage" name="heureDebutCoulage" type="datetime-local" className="champ" defaultValue={chantier.dateCoulage ? `${chantier.dateCoulage}T${chantier.heurePremierCamion ?? "07:30"}` : undefined} required />
              </div>
              <div>
                <label htmlFor="heureFinCoulage" className="etiquette">Fin</label>
                <input id="heureFinCoulage" name="heureFinCoulage" type="datetime-local" className="champ" defaultValue={chantier.dateCoulage ? `${chantier.dateCoulage}T11:30` : undefined} />
              </div>
              <div>
                <label htmlFor="surfaceCouleeM2" className="etiquette">Surface coulée (m²)</label>
                <input id="surfaceCouleeM2" name="surfaceCouleeM2" type="number" step="0.1" className="champ" defaultValue={devis ? devis.pieces.reduce((s, p) => s + p.surfaceM2, 0) : undefined} />
              </div>
              <div>
                <label htmlFor="temperatureC" className="etiquette">Température (°C)</label>
                <input id="temperatureC" name="temperatureC" type="number" step="0.5" className="champ" defaultValue={chantier.temperatureC} />
              </div>
              <div className="sm:col-span-4">
                <button type="submit" className="bouton-primaire">Chantier coulé</button>
              </div>
            </form>
            <form action={changerStatutChantier.bind(null, id, "planifie")} className="flex flex-col gap-2 lg:w-64">
              <label htmlFor="motifReport" className="etiquette">Reporter le coulage</label>
              <input id="motifReport" name="motifReport" className="champ" placeholder="Motif du report" required />
              <button type="submit" className="bouton-secondaire">Reporter</button>
            </form>
          </div>
        )}

        {!modePlanif && chantier.statut === "coule" && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-brand-900">
              Coulage terminé le {fmtDate(chantier.dateCoulage)}. Saisissez les bons de livraison ci-dessous, puis passez le chantier en séchage.
            </p>
            <form action={changerStatutChantier.bind(null, id, "sechage")}>
              <button type="submit" className="bouton-primaire">Passer en séchage</button>
            </form>
          </div>
        )}

        {!modePlanif && chantier.statut === "sechage" && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-brand-900">
              Séchage estimé jusqu&apos;au <strong>{fmtDate(sechage?.toISOString())}</strong> (indicatif). Seule une mesure CM {seuilCM !== null ? `≤ ${seuilCM} %` : ""} autorise la pose du revêtement.
            </p>
            <form action={changerStatutChantier.bind(null, id, "reception")}>
              <button type="submit" className="bouton-primaire">Réception des travaux</button>
            </form>
          </div>
        )}

        {!modePlanif && chantier.statut === "reception" && (
          <div className="flex flex-wrap items-end gap-3">
            <p className="basis-full text-sm text-brand-900">PV de réception signé : émettez la facture de solde, acomptes déduits.</p>
            <form action={creerFactureChantier.bind(null, id, "solde")} className="flex flex-wrap items-end gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="retenueGarantie" defaultChecked={client?.type !== "particulier"} /> Retenue de garantie 5 %
              </label>
              <button type="submit" className="bouton-primaire" disabled={!devis}>Facture de solde</button>
            </form>
          </div>
        )}

        {!modePlanif && chantier.statut === "facture" && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-brand-900">Chantier facturé. Clôturez-le une fois le solde encaissé.</p>
            <form action={changerStatutChantier.bind(null, id, "clos")}>
              <button type="submit" className="bouton-secondaire">Clore le chantier</button>
            </form>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Livraisons */}
          <Carte titre={`Livraisons · ${livraisons.length} toupie${livraisons.length > 1 ? "s" : ""}, ${fmtNombre(volumeLivre)} m³`} classe="scroll-mt-6" >
            <div id="livraisons" />
            {livraisons.length === 0 ? (
              <p className="text-sm text-stone-500">Aucun bon de livraison saisi.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="tableau">
                  <thead>
                    <tr>
                      <th>Bon</th>
                      <th>Fabrication</th>
                      <th>Arrivée</th>
                      <th className="text-right">Volume</th>
                      <th className="text-right">Étal. départ</th>
                      <th className="text-right">Étal. chantier</th>
                      <th className="text-right">Eau</th>
                      <th>Contrôle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {livraisons.map((l) => (
                      <tr key={l.id}>
                        <td className="font-medium">{l.numeroBon}<div className="text-xs font-normal text-stone-500">{l.uniteProduction}</div></td>
                        <td>{fmtHeure(l.heureFabrication)}</td>
                        <td>{fmtHeure(l.heureArrivee)}</td>
                        <td className="text-right tabular-nums">{fmtNombre(l.volumeM3)} m³</td>
                        <td className="text-right tabular-nums">{l.etalementDepartCm ? `${fmtNombre(l.etalementDepartCm)} cm` : "—"}</td>
                        <td className="text-right tabular-nums">{fmtNombre(l.etalementChantierCm)} cm</td>
                        <td className="text-right tabular-nums">{fmtNombre(l.eauAjouteeLParM3)} l/m³</td>
                        <td>
                          {l.alertes.length === 0 ? (
                            <Badge classe="bg-brand-100 text-brand-800">Conforme</Badge>
                          ) : (
                            <Badge classe={l.alertes.some((a) => a.severite === "bloquant") ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}>
                              {l.alertes.length} alerte{l.alertes.length > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {alertesLivraisons.length > 0 && <div className="mt-3"><ListeAlertes alertes={alertesLivraisons} /></div>}

            {["pret", "coule", "sechage"].includes(chantier.statut) && (
              <form action={ajouterLivraison.bind(null, id)} className="mt-4 grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-3 sm:grid-cols-3 lg:grid-cols-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-stone-800 sm:col-span-3 lg:col-span-4">
                  <Truck className="h-4 w-4" aria-hidden /> Nouvelle toupie {produit ? `· ${produit.nom} : étalement ${produit.etalementMinCm} à ${produit.etalementMaxCm} cm, eau max ${produit.eauMaxLParM3} l/m³` : ""}
                </h3>
                <div>
                  <label htmlFor="numeroBon" className="etiquette">N° de bon</label>
                  <input id="numeroBon" name="numeroBon" required className="champ" />
                </div>
                <div>
                  <label htmlFor="uniteProduction" className="etiquette">Unité de production</label>
                  <input id="uniteProduction" name="uniteProduction" className="champ" defaultValue={centrale?.nom} />
                </div>
                <div>
                  <label htmlFor="volumeM3" className="etiquette">Volume (m³)</label>
                  <input id="volumeM3" name="volumeM3" type="number" step="0.1" min={0} required className="champ" />
                </div>
                <div>
                  <label htmlFor="eauAjouteeLParM3" className="etiquette">Eau ajoutée (l/m³)</label>
                  <input id="eauAjouteeLParM3" name="eauAjouteeLParM3" type="number" step="1" min={0} defaultValue={0} className="champ" />
                </div>
                <div>
                  <label htmlFor="etalementDepartCm" className="etiquette">Étalement départ (cm)</label>
                  <input id="etalementDepartCm" name="etalementDepartCm" type="number" step="0.5" className="champ" />
                </div>
                <div>
                  <label htmlFor="etalementChantierCm" className="etiquette">Étalement chantier (cm)</label>
                  <input id="etalementChantierCm" name="etalementChantierCm" type="number" step="0.5" required className="champ" />
                </div>
                <div>
                  <label htmlFor="heureFabrication" className="etiquette">Heure de fabrication</label>
                  <input id="heureFabrication" name="heureFabrication" type="time" className="champ" />
                </div>
                <div>
                  <label htmlFor="heureArrivee" className="etiquette">Heure d&apos;arrivée</label>
                  <input id="heureArrivee" name="heureArrivee" type="time" className="champ" />
                </div>
                <div className="sm:col-span-3 lg:col-span-4">
                  <button type="submit" className="bouton-primaire">Enregistrer la toupie</button>
                </div>
              </form>
            )}
          </Carte>

          {/* Contrôles */}
          <Carte titre="Contrôles" classe="scroll-mt-6">
            <div id="controles" />
            {controles.length === 0 && !visite && <p className="text-sm text-stone-500">Aucun contrôle enregistré.</p>}
            <ul className="space-y-3">
              {controles.map((c) => (
                <li key={c.id} className="rounded-md border border-stone-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">
                      {c.type === "visite_technique" ? "Visite technique" : c.type === "coulage" ? "Contrôles pendant le coulage" : c.type === "mesure_cm" ? "Mesure d'humidité CM" : c.type === "reception" ? "Réception" : "Contrôle"}
                      <span className="ml-2 text-xs font-normal text-stone-500">
                        {fmtDate(c.createdAt)} · {membres.find((m) => m.id === c.auteurId)?.nom ?? "—"}
                      </span>
                    </div>
                    <Badge classe={c.conforme ? "bg-brand-100 text-brand-800" : c.conforme === false ? "bg-rose-100 text-rose-800" : "bg-stone-100 text-stone-700"}>
                      {c.conforme ? "Conforme" : c.conforme === false ? "Non conforme" : "—"}
                    </Badge>
                  </div>
                  {c.type === "visite_technique" && (
                    <ul className="mt-2 grid gap-1 text-xs text-stone-600 sm:grid-cols-2">
                      {VISITE_TECHNIQUE.map((p) => (
                        <li key={p.cle} className={c.reponses[p.cle] === "non" ? "text-rose-700" : ""}>
                          {c.reponses[p.cle] === "oui" ? "✓" : c.reponses[p.cle] === "non" ? "✗" : "–"} {p.libelle}
                        </li>
                      ))}
                    </ul>
                  )}
                  {c.mesures.length > 0 && (
                    <ul className="mt-2 text-xs text-stone-600">
                      {c.mesures.map((m, i) => (
                        <li key={i} className={m.conforme ? "" : "text-rose-700"}>
                          {m.type} : {m.valeur} {m.unite} {m.commentaire ? `(${m.commentaire})` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                  {c.commentaire && <p className="mt-2 text-xs text-stone-600">{c.commentaire}</p>}
                </li>
              ))}
            </ul>

            {(visite === "1" || (chantier.statut === "planifie" && !derniereVisite && !planifier)) && (
              <form action={enregistrerVisiteTechnique.bind(null, id)} className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3">
                <h3 className="text-sm font-semibold text-stone-800">Visite technique avant coulage</h3>
                <p className="mb-3 text-xs text-stone-500">Un point bloquant « non » laisse le chantier en préparation. Tout « oui » le passe « Prêt à couler ».</p>
                <ul className="divide-y divide-stone-200">
                  {VISITE_TECHNIQUE.map((p) => (
                    <li key={p.cle} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <span>
                        {p.libelle}
                        <span className="ml-1 text-xs text-stone-400">{p.reference}{p.bloquant ? " · bloquant" : ""}</span>
                      </span>
                      <span className="flex gap-3 text-sm">
                        {(["oui", "non", "na"] as const).map((v) => (
                          <label key={v} className="flex items-center gap-1">
                            <input type="radio" name={`point_${p.cle}`} value={v} defaultChecked={v === "oui"} /> {v === "na" ? "s.o." : v}
                          </label>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
                  <div>
                    <label htmlFor="temperatureC_visite" className="etiquette">Température (°C)</label>
                    <input id="temperatureC_visite" name="temperatureC" type="number" step="0.5" className="champ" />
                  </div>
                  <div>
                    <label htmlFor="commentaire" className="etiquette">Observations</label>
                    <input id="commentaire" name="commentaire" className="champ" />
                  </div>
                </div>
                <button type="submit" className="bouton-primaire mt-3">Enregistrer la visite</button>
              </form>
            )}
          </Carte>

          {/* Fil de chantier */}
          <Carte titre={`Fil de chantier · ${messages.length} message${messages.length > 1 ? "s" : ""}`} classe="scroll-mt-6">
            <div id="fil" />
            <FilChantier messages={messages} membres={membres} moiId={session.membre.id} bureau={estBureau(session)} publier={publierMessage.bind(null, id)} traiter={traiterSignalement.bind(null, id)} />
          </Carte>

          {/* Facturation */}
          <Carte titre="Facturation">
            {mesFactures.length === 0 ? <p className="text-sm text-stone-500">Aucune facture pour ce chantier.</p> : (
              <ul className="divide-y divide-stone-100">
                {mesFactures.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-sm">
                      <span className="font-medium">{f.numero}</span> · {libelleTypeFacture[f.type]} · {fmtDate(f.dateEmission)}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-sm tabular-nums">{fmtEuros(f.totalTTC)}</span>
                      <Badge classe={libelleStatutFacture[f.statut].classe}>{libelleStatutFacture[f.statut].label}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {devis && !["facture", "clos"].includes(chantier.statut) && !mesFactures.some((f) => f.type === "acompte") && (
              <form action={creerFactureChantier.bind(null, id, "acompte")} className="mt-3 flex flex-wrap items-end gap-3">
                <div>
                  <label htmlFor="pourcentage" className="etiquette">Acompte (%)</label>
                  <input id="pourcentage" name="pourcentage" type="number" min={1} max={100} defaultValue={30} className="champ w-28" />
                </div>
                <button type="submit" className="bouton-secondaire">Émettre la facture d&apos;acompte</button>
              </form>
            )}
          </Carte>
        </div>

        <div className="space-y-6">
          <Carte titre="Organisation">
            <Definition
              items={[
                { libelle: "Coulage", valeur: chantier.dateCoulage ? `${fmtDate(chantier.dateCoulage)}${chantier.heurePremierCamion ? `, 1er camion ${chantier.heurePremierCamion}` : ""}` : "À planifier" },
                { libelle: "Équipe", valeur: equipe ? `${equipe.nom}${chantier.renforts && chantier.renforts.length > 0 ? ` + ${chantier.renforts.map((r) => r.nom).join(", ")}` : ""}` : "—" },
                { libelle: "Chef d'équipe", valeur: chef ? `${chef.nom}${chef.cqpNumero ? ` · CQP ${chef.cqpNumero}` : " · sans CQP"}` : "À affecter" },
                { libelle: "Produit", valeur: produit ? `${produit.fabricant} ${produit.nom} (${produit.classe})` : "—" },
                { libelle: "Centrale", valeur: centrale ? `${centrale.nom} · commande par ${centrale.canalCommande === "email" ? "e-mail" : "portail"}` : "—" },
                { libelle: "Pompage", valeur: chantier.distancePompageM ? `${chantier.distancePompageM} m${chantier.etage ? `, étage ${chantier.etage}` : ""}` : "—" },
                { libelle: "Support", valeur: chantier.natureSupport ?? "—" },
                { libelle: "Accès camion", valeur: chantier.accesCamion ?? "—" },
                { libelle: "Classement", valeur: chantier.classementUPEC ?? "—" },
              ]}
            />
            {chantier.motifReport && <p className="mt-3 text-xs text-amber-700">Dernier report : {chantier.motifReport}</p>}
          </Carte>

          {jalons.length > 0 && (
            <Carte titre="Jalons après coulage">
              <ol className="space-y-2 text-sm">
                {jalons.map((j) => {
                  // Composant serveur rendu à chaque requête : l'heure courante y est stable.
                  // eslint-disable-next-line react-hooks/purity
                  const passe = j.date.getTime() < Date.now();
                  return (
                    <li key={j.code} className={`flex gap-3 ${passe ? "text-stone-400" : "text-stone-800"}`}>
                      <span className="w-20 shrink-0 tabular-nums">{fmtDate(j.date.toISOString())}</span>
                      <span>
                        {j.maximal ? "Au plus tard : " : ""}{j.libelle}
                        <span className="block text-xs text-stone-400">{j.reference}</span>
                      </span>
                    </li>
                  );
                })}
                {sechage && (
                  <li className="flex gap-3 border-t border-stone-100 pt-2 text-stone-800">
                    <span className="w-20 shrink-0 tabular-nums">{fmtDate(sechage.toISOString())}</span>
                    <span>
                      Fin de séchage estimée ({fmtNombre(Math.round(epaisseurMoyenne * 10) / 10)} cm)
                      <span className="block text-xs text-stone-400">Indicatif : {nombrePrelevementsCM(chantier.surfaceCouleeM2 ?? 0) || 2} mesures CM{seuilCM !== null ? ` ≤ ${seuilCM} %` : ""} avant la pose</span>
                    </span>
                  </li>
                )}
              </ol>
            </Carte>
          )}

          <Carte titre="Traçabilité QB46">
            {fiche.complete ? (
              <p className="rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800">Fiche complète : tous les champs du § 18 sont renseignés.</p>
            ) : (
              <>
                <p className="text-sm text-stone-600">
                  {fiche.champs.length - fiche.manquants.length} champs sur {fiche.champs.length} renseignés. Manquent :
                </p>
                <ul className="mt-2 list-disc pl-5 text-xs text-stone-600">
                  {fiche.manquants.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </>
            )}
            <a href={`/app/chantiers/${id}/tracabilite`} target="_blank" rel="noopener" className="bouton-secondaire mt-3 w-full">
              <Download className="h-4 w-4" aria-hidden /> Fiche PDF
            </a>
          </Carte>
          {chantier.notes && (
            <Carte titre="Notes">
              <p className="whitespace-pre-line text-sm text-stone-700">{chantier.notes}</p>
            </Carte>
          )}
          {controles.length === 0 && livraisons.length === 0 && chantier.statut === "clos" && <Vide titre="Chantier clos sans contrôle" />}
        </div>
      </div>
    </>
  );
}
