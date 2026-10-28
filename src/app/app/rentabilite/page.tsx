import Link from "next/link";
import { getStore } from "@/lib/auth/session";
import { exiger } from "@/lib/auth/roles";
import { chiffrerDevisEnregistre } from "@/lib/domain/chiffrage";
import { rentabiliteChantier, rentabiliteParEquipe } from "@/lib/domain/rentabilite";
import { fmtDate, fmtEuros, fmtNombre } from "@/lib/format";
import { Badge, Carte, EnTete, Stat } from "@/components/ui";

export const metadata = { title: "Rentabilité" };

export default async function Rentabilite() {
  const { session, store } = await getStore();
  exiger(session, "rentabilite");
  const [chantiers, clients, devisListe, factures, produits, membres, equipes, pointages] = await Promise.all([
    store.chantiers(),
    store.clients(),
    store.devisListe(),
    store.factures(),
    store.produits(),
    store.membres(),
    store.equipes(),
    store.pointages(),
  ]);
  const coules = chantiers.filter((c) => ["coule", "sechage", "reception", "facture", "clos"].includes(c.statut));
  const livraisonsParChantier = new Map(await Promise.all(coules.map(async (c) => [c.id, await store.livraisons(c.id)] as const)));

  const lignes = coules
    .map((c) => {
      const devis = devisListe.find((d) => d.id === c.devisId);
      const produit = produits.find((p) => p.id === c.produitId) ?? null;
      const resultatDevis = devis ? chiffrerDevisEnregistre(devis, session.entreprise, produit) : null;
      const r = rentabiliteChantier({
        chantier: c,
        resultatDevis,
        factures,
        livraisons: livraisonsParChantier.get(c.id) ?? [],
        pointages: pointages.filter((p) => p.chantierId === c.id),
        membres,
        produit,
        forfaitPompeJour: session.entreprise.grilleTarifaire.forfaitPompeJour,
        coutHoraireDefaut: session.entreprise.coutHoraireDefaut ?? 26,
      });
      return { c, r };
    })
    .sort((a, b) => (b.c.dateCoulage ?? "").localeCompare(a.c.dateCoulage ?? ""));

  const rentabilites = lignes.map((l) => l.r);
  const complets = rentabilites.filter((r) => r.complet);
  const margeMoyenne = complets.length > 0 ? Math.round((complets.reduce((s, r) => s + (r.margePct ?? 0), 0) / complets.length) * 10) / 10 : null;
  const pertesMoyennes = (() => {
    const avec = rentabilites.filter((r) => r.pertesReellesPct !== null);
    return avec.length > 0 ? Math.round((avec.reduce((s, r) => s + (r.pertesReellesPct ?? 0), 0) / avec.length) * 10) / 10 : null;
  })();
  const parEquipe = rentabiliteParEquipe(coules, rentabilites);

  return (
    <>
      <EnTete titre="Rentabilité réelle" sousTitre="Ce que chaque chantier a rapporté, contre ce qu'il a coûté en mortier livré, heures pointées et pompe. Visible du gérant uniquement." />
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat libelle="Marge moyenne" valeur={margeMoyenne !== null ? `${fmtNombre(margeMoyenne)} %` : "—"} detail={`sur ${complets.length} chantier${complets.length > 1 ? "s" : ""} complet${complets.length > 1 ? "s" : ""}`} accent />
        <Stat libelle="Marge cumulée" valeur={fmtEuros(rentabilites.reduce((s, r) => s + r.margeEuros, 0))} detail={`${coules.length} chantiers coulés`} />
        <Stat libelle="Pertes réelles de mortier" valeur={pertesMoyennes !== null ? `${fmtNombre(pertesMoyennes)} %` : "—"} detail={`contre ${Math.round(session.entreprise.tauxPertes * 100)} % prévus au devis`} />
        <Stat libelle="Heures pointées" valeur={`${fmtNombre(rentabilites.reduce((s, r) => s + r.couts.heures, 0))} h`} detail="sur les chantiers coulés" />
      </div>

      <Carte titre="Par chantier" classe="mb-6">
        <div className="overflow-x-auto">
          <table className="tableau min-w-[1000px]">
            <thead>
              <tr>
                <th>Chantier</th>
                <th className="text-right">Prévu HT</th>
                <th className="text-right">Facturé HT</th>
                <th className="text-right">Mortier</th>
                <th className="text-right">Heures</th>
                <th className="text-right">Main-d&apos;œuvre</th>
                <th className="text-right">Pompe</th>
                <th className="text-right">Marge</th>
                <th className="text-right">Pertes</th>
                <th className="text-right">m²/h</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map(({ c, r }) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/app/chantiers/${c.id}`} className="font-medium text-stone-900 hover:text-brand-700">{c.numero}</Link>
                    <div className="text-xs text-stone-500">{clients.find((x) => x.id === c.clientId)?.nom} · {fmtDate(c.dateCoulage)}{!r.complet && <Badge classe="ml-1 bg-stone-100 text-stone-600">incomplet</Badge>}</div>
                  </td>
                  <td className="text-right tabular-nums">{fmtEuros(r.prevuHT)}</td>
                  <td className="text-right tabular-nums font-medium">{fmtEuros(r.factureHT)}</td>
                  <td className="text-right tabular-nums">{fmtEuros(r.couts.mortier)}<div className="text-xs text-stone-400">{fmtNombre(r.volumeLivreM3)} m³</div></td>
                  <td className="text-right tabular-nums">{fmtNombre(r.couts.heures)} h</td>
                  <td className="text-right tabular-nums">{fmtEuros(r.couts.mainOeuvre)}</td>
                  <td className="text-right tabular-nums">{fmtEuros(r.couts.pompe)}</td>
                  <td className={`text-right tabular-nums font-semibold ${r.margeEuros < 0 ? "text-rose-700" : "text-brand-700"}`}>
                    {fmtEuros(r.margeEuros)}
                    {r.margePct !== null && <div className="text-xs font-normal">{fmtNombre(r.margePct)} %</div>}
                  </td>
                  <td className={`text-right tabular-nums ${r.pertesReellesPct !== null && r.pertesReellesPct > session.entreprise.tauxPertes * 100 ? "text-amber-700" : ""}`}>{r.pertesReellesPct !== null ? `${fmtNombre(r.pertesReellesPct)} %` : "—"}</td>
                  <td className="text-right tabular-nums">{r.m2ParHeure !== null ? fmtNombre(r.m2ParHeure) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-stone-500">Un chantier est « complet » quand il a une facture, des bons de livraison et des heures pointées. La main-d&apos;œuvre utilise le coût horaire chargé de chaque compagnon (fiche Équipe), sinon {fmtEuros(session.entreprise.coutHoraireDefaut ?? 26)}/h.</p>
      </Carte>

      <Carte titre="Par équipe">
        {parEquipe.length === 0 ? <p className="text-sm text-stone-500">Aucun chantier coulé avec une équipe affectée.</p> : (
          <table className="tableau">
            <thead>
              <tr>
                <th>Équipe</th>
                <th className="text-right">Chantiers</th>
                <th className="text-right">m² coulés</th>
                <th className="text-right">m² par jour de coulage</th>
                <th className="text-right">Heures par m²</th>
                <th className="text-right">Marge cumulée</th>
              </tr>
            </thead>
            <tbody>
              {parEquipe.map((e) => (
                <tr key={e.equipeId}>
                  <td className="font-medium">{equipes.find((x) => x.id === e.equipeId)?.nom ?? "—"}</td>
                  <td className="text-right tabular-nums">{e.chantiers}</td>
                  <td className="text-right tabular-nums">{fmtNombre(e.m2)}</td>
                  <td className="text-right tabular-nums">{e.m2ParJour ?? "—"}</td>
                  <td className="text-right tabular-nums">{e.heuresParM2 !== null ? fmtNombre(e.heuresParM2) : "—"}</td>
                  <td className={`text-right tabular-nums font-semibold ${e.margeEuros < 0 ? "text-rose-700" : "text-brand-700"}`}>{fmtEuros(e.margeEuros)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Carte>
    </>
  );
}
