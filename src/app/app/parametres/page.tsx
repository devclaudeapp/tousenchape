import { getStore } from "@/lib/auth/session";
import { fmtDate, fmtEuros, libelleLiant } from "@/lib/format";
import { Badge, Carte, EnTete } from "@/components/ui";
import { enregistrerEntreprise, enregistrerGrille } from "./actions";

function Champ({ id, label, defaultValue, type = "text", step, lectureSeule }: { id: string; label: string; defaultValue?: string | number; type?: string; step?: string; lectureSeule: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="etiquette">{label}</label>
      <input id={id} name={id} type={type} step={step} defaultValue={defaultValue} className="champ" disabled={lectureSeule} />
    </div>
  );
}

export const metadata = { title: "Paramètres" };

export default async function Parametres({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const { session, store } = await getStore();
  const [entreprise, membres, produits, centrales] = await Promise.all([store.entreprise(), store.membres(), store.produits(), store.centrales()]);
  const g = entreprise.grilleTarifaire;
  const lectureSeule = session.membre.role !== "gerant";

  return (
    <>
      <EnTete titre="Paramètres" sousTitre={lectureSeule ? "Lecture seule : seul le gérant modifie les paramètres." : "Entreprise, tarifs, équipe et référentiel produits."} />
      {ok && <p className="mb-4 rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900">Paramètres enregistrés.</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <form action={enregistrerEntreprise} className="carte space-y-4 p-5">
          <h2 className="text-sm font-semibold text-stone-800">Entreprise et mentions légales</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ lectureSeule={lectureSeule} id="nom" label="Raison sociale" defaultValue={entreprise.nom} />
            <Champ lectureSeule={lectureSeule} id="siren" label="SIREN" defaultValue={entreprise.siren} />
            <Champ lectureSeule={lectureSeule} id="tvaIntracom" label="N° TVA intracommunautaire" defaultValue={entreprise.tvaIntracom} />
            <Champ lectureSeule={lectureSeule} id="telephone" label="Téléphone" defaultValue={entreprise.telephone} />
            <Champ lectureSeule={lectureSeule} id="email" label="E-mail" defaultValue={entreprise.email} type="email" />
            <Champ lectureSeule={lectureSeule} id="adresse" label="Adresse" defaultValue={entreprise.adresse} />
            <Champ lectureSeule={lectureSeule} id="codePostal" label="Code postal" defaultValue={entreprise.codePostal} />
            <Champ lectureSeule={lectureSeule} id="ville" label="Ville" defaultValue={entreprise.ville} />
          </div>
          <h3 className="pt-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Assurance décennale (jointe aux devis et factures)</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ lectureSeule={lectureSeule} id="assureurDecennale" label="Assureur" defaultValue={entreprise.assureurDecennale} />
            <Champ lectureSeule={lectureSeule} id="numeroContratDecennale" label="N° de contrat" defaultValue={entreprise.numeroContratDecennale} />
            <Champ lectureSeule={lectureSeule} id="zoneCouvertureDecennale" label="Zone couverte" defaultValue={entreprise.zoneCouvertureDecennale} />
            <Champ lectureSeule={lectureSeule} id="attestationDecennaleExpireLe" label="Attestation valable jusqu'au" defaultValue={entreprise.attestationDecennaleExpireLe} type="date" />
          </div>
          <Champ lectureSeule={lectureSeule} id="mediateurConsommation" label="Médiateur de la consommation (clients particuliers)" defaultValue={entreprise.mediateurConsommation} />
          {!lectureSeule && <button type="submit" className="bouton-primaire">Enregistrer</button>}
        </form>

        <form action={enregistrerGrille} className="carte space-y-4 p-5">
          <h2 className="text-sm font-semibold text-stone-800">Grille tarifaire (€ HT)</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ lectureSeule={lectureSeule} id="prixMortierM3" label="Mortier départ centrale, par m³ (défaut)" defaultValue={g.prixMortierM3} type="number" step="0.01" />
            <Champ lectureSeule={lectureSeule} id="coefficientMortier" label="Coefficient sur le mortier" defaultValue={g.coefficientMortier} type="number" step="0.01" />
            <Champ lectureSeule={lectureSeule} id="forfaitPompeJour" label="Pompe et déplacement, par jour" defaultValue={g.forfaitPompeJour} type="number" step="0.01" />
            <Champ lectureSeule={lectureSeule} id="plusValuePompageDifficile" label="Plus-value pompage difficile" defaultValue={g.plusValuePompageDifficile} type="number" step="0.01" />
            <Champ lectureSeule={lectureSeule} id="franchiseKm" label="Franchise kilométrique (km)" defaultValue={g.franchiseKm} type="number" />
            <Champ lectureSeule={lectureSeule} id="prixKmSupplementaire" label="Prix du km supplémentaire" defaultValue={g.prixKmSupplementaire} type="number" step="0.01" />
            <Champ lectureSeule={lectureSeule} id="prixFilmM2" label="Film, par m²" defaultValue={g.prixFilmM2} type="number" step="0.01" />
            <Champ lectureSeule={lectureSeule} id="prixBandeMl" label="Bande périphérique, par ml" defaultValue={g.prixBandeMl} type="number" step="0.01" />
            <Champ lectureSeule={lectureSeule} id="prixPoncageM2" label="Ponçage, par m²" defaultValue={g.prixPoncageM2} type="number" step="0.01" />
            <Champ lectureSeule={lectureSeule} id="prixPrimaireM2" label="Primaire, par m²" defaultValue={g.prixPrimaireM2} type="number" step="0.01" />
            <Champ lectureSeule={lectureSeule} id="prixIsolantSC1" label="Isolant SC1, par m²" defaultValue={g.prixIsolantM2.SC1} type="number" step="0.01" />
            <Champ lectureSeule={lectureSeule} id="prixIsolantSC2" label="Isolant SC2, par m²" defaultValue={g.prixIsolantM2.SC2} type="number" step="0.01" />
            <Champ lectureSeule={lectureSeule} id="prixMesureCM" label="Mesure CM, par prélèvement" defaultValue={g.prixMesureCM} type="number" step="0.01" />
            <Champ lectureSeule={lectureSeule} id="forfaitDechets" label="Gestion des déchets (forfait)" defaultValue={g.forfaitDechets} type="number" step="0.01" />
            <Champ lectureSeule={lectureSeule} id="minimumFacturation" label="Minimum de facturation" defaultValue={g.minimumFacturation} type="number" step="0.01" />
            <Champ lectureSeule={lectureSeule} id="tauxPertes" label="Taux de pertes (%)" defaultValue={Math.round(entreprise.tauxPertes * 100)} type="number" step="1" />
          </div>
          <h3 className="pt-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Main-d&apos;œuvre de coulage, par m², selon la surface totale</h3>
          <div className="grid gap-3 sm:grid-cols-4">
            {g.mainOeuvreParTranche.map((t, i) => (
              <Champ key={i} lectureSeule={lectureSeule} id={`tranche_${i}`} label={t.jusquaM2 === null ? `Au-delà` : `Jusqu'à ${t.jusquaM2} m²`} defaultValue={t.prixM2} type="number" step="0.5" />
            ))}
          </div>
          {!lectureSeule && <button type="submit" className="bouton-primaire">Enregistrer la grille</button>}
        </form>

        <Carte titre="Équipe">
          <table className="tableau">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Rôle</th>
                <th>Équipe</th>
                <th>CQP chapiste</th>
              </tr>
            </thead>
            <tbody>
              {membres.map((m) => (
                <tr key={m.id}>
                  <td>
                    {m.nom}
                    <div className="text-xs text-stone-500">{m.email}</div>
                  </td>
                  <td className="capitalize">{m.role.replace("_", " ")}</td>
                  <td>{m.equipe ?? "—"}</td>
                  <td>
                    {m.cqpNumero ? (
                      <Badge classe="bg-brand-100 text-brand-800">
                        {m.cqpNumero} · {fmtDate(m.cqpDate)}
                      </Badge>
                    ) : m.role === "chef_equipe" ? (
                      <Badge classe="bg-rose-100 text-rose-800">Manquant</Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-stone-500">Depuis le 1er août 2024, chaque chantier doit compter un chef d&apos;équipe titulaire du CQP chapiste. L&apos;invitation de nouveaux membres par e-mail arrive avec la connexion Supabase.</p>
        </Carte>

        <Carte titre="Produits certifiés et centrales">
          <table className="tableau">
            <thead>
              <tr>
                <th>Produit</th>
                <th>Liant</th>
                <th className="text-right">Étalement</th>
                <th className="text-right">Eau max</th>
                <th className="text-right">Prix m³</th>
              </tr>
            </thead>
            <tbody>
              {produits.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="font-medium">{p.fabricant} {p.nom}</div>
                    <div className="text-xs text-stone-500">{p.classe}{p.certificatQB46 ? ` · ${p.certificatQB46}` : ""}</div>
                  </td>
                  <td className="text-xs">{libelleLiant[p.liant]}</td>
                  <td className="text-right tabular-nums">{p.etalementMinCm}–{p.etalementMaxCm} cm</td>
                  <td className="text-right tabular-nums">{p.eauMaxLParM3} l/m³</td>
                  <td className="text-right tabular-nums">{p.prixM3 ? fmtEuros(p.prixM3) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3 className="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Centrales</h3>
          <ul className="divide-y divide-stone-100 text-sm">
            {centrales.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <span>
                  {c.nom} <span className="text-stone-500">· {c.ville}</span>
                </span>
                <span className="text-xs text-stone-500">
                  toupie {c.capaciteToupieM3} m³ · commande par {c.canalCommande === "email" ? "e-mail" : "portail"} · délai {c.delaiCommandeHeures} h
                </span>
              </li>
            ))}
          </ul>
        </Carte>
      </div>
    </>
  );
}
