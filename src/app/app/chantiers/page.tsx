import Link from "next/link";
import { getStore } from "@/lib/auth/session";
import { fmtDate, libelleStatutChantier } from "@/lib/format";
import { Badge, EnTete, Vide } from "@/components/ui";
import type { Chantier, Client, Membre, Produit } from "@/lib/domain/types";

function Tableau({ liste, clients, produits, membres }: { liste: Chantier[]; clients: Client[]; produits: Produit[]; membres: Membre[] }) {
  return (
    <div className="carte overflow-x-auto">
      <table className="tableau">
        <thead>
          <tr>
            <th>Numéro</th>
            <th>Client · adresse</th>
            <th>Coulage</th>
            <th>Produit</th>
            <th>Chef d&apos;équipe</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {liste.map((c) => {
            const chef = membres.find((m) => m.id === c.chefEquipeId);
            return (
              <tr key={c.id} className="hover:bg-stone-50">
                <td>
                  <Link href={`/app/chantiers/${c.id}`} className="font-medium text-stone-900 hover:text-brand-700">
                    {c.numero}
                  </Link>
                </td>
                <td>
                  <div>{clients.find((x) => x.id === c.clientId)?.nom ?? "—"}</div>
                  <div className="text-xs text-stone-500">
                    {c.adresse}, {c.codePostal} {c.ville}
                  </div>
                </td>
                <td>
                  {fmtDate(c.dateCoulage)}
                  {c.heurePremierCamion && <div className="text-xs text-stone-500">1er camion {c.heurePremierCamion}</div>}
                </td>
                <td className="text-stone-600">{produits.find((p) => p.id === c.produitId)?.nom ?? "—"}</td>
                <td>
                  {chef ? (
                    <>
                      {chef.nom}
                      {!chef.cqpNumero && <div className="text-xs text-rose-700">Sans CQP</div>}
                    </>
                  ) : (
                    <span className="text-rose-700">À affecter</span>
                  )}
                </td>
                <td>
                  <Badge classe={libelleStatutChantier[c.statut].classe}>{libelleStatutChantier[c.statut].label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const metadata = { title: "Chantiers" };

export default async function Chantiers() {
  const { store } = await getStore();
  const [chantiers, clients, produits, membres] = await Promise.all([store.chantiers(), store.clients(), store.produits(), store.membres()]);
  const actifs = chantiers.filter((c) => c.statut !== "clos");
  const clos = chantiers.filter((c) => c.statut === "clos");

  return (
    <>
      <EnTete titre="Chantiers" sousTitre={`${actifs.length} chantier${actifs.length > 1 ? "s" : ""} en cours`} />
      {actifs.length === 0 ? <Vide titre="Aucun chantier en cours" detail="Un devis signé devient automatiquement un chantier." /> : <Tableau liste={actifs} clients={clients} produits={produits} membres={membres} />}
      {clos.length > 0 && (
        <>
          <h2 className="mt-8 mb-3 text-sm font-semibold text-stone-700">Chantiers clos</h2>
          <Tableau liste={clos} clients={clients} produits={produits} membres={membres} />
        </>
      )}
    </>
  );
}
