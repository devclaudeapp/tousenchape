import Link from "next/link";
import { Plus } from "lucide-react";
import { getStore } from "@/lib/auth/session";
import { exiger } from "@/lib/auth/roles";
import { chiffrerDevisEnregistre } from "@/lib/domain/chiffrage";
import { fmtDate, fmtEuros, fmtNombre, libelleStatutDevis } from "@/lib/format";
import { Badge, EnTete, Vide } from "@/components/ui";

export const metadata = { title: "Devis" };

export default async function ListeDevis() {
  const { session, store } = await getStore();
  exiger(session, "devis");
  const [devis, clients, produits] = await Promise.all([store.devisListe(), store.clients(), store.produits()]);

  return (
    <>
      <EnTete
        titre="Devis"
        sousTitre={`${devis.length} devis`}
        actions={
          <Link href="/app/devis/nouveau" className="bouton-primaire">
            <Plus className="h-4 w-4" aria-hidden /> Nouveau devis
          </Link>
        }
      />
      {devis.length === 0 ? (
        <Vide
          titre="Aucun devis"
          detail="Le premier devis se fait en moins de 10 minutes : pièces, produit, mode de pose, et le reste est calculé."
          action={
            <Link href="/app/devis/nouveau" className="bouton-primaire">
              Créer un devis
            </Link>
          }
        />
      ) : (
        <div className="carte overflow-x-auto">
          <table className="tableau">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Client</th>
                <th>Objet</th>
                <th className="text-right">Surface</th>
                <th className="text-right">Total HT</th>
                <th>Statut</th>
                <th>Validité</th>
              </tr>
            </thead>
            <tbody>
              {devis.map((d) => {
                const r = chiffrerDevisEnregistre(d, session.entreprise, produits.find((p) => p.id === d.produitId));
                const bloquant = r.alertes.some((a) => a.severite === "bloquant");
                return (
                  <tr key={d.id} className="hover:bg-stone-50">
                    <td>
                      <Link href={`/app/devis/${d.id}`} className="font-medium text-stone-900 hover:text-brand-700">
                        {d.numero}
                        {d.version > 1 && <span className="text-stone-500"> v{d.version}</span>}
                      </Link>
                      <div className="text-xs text-stone-500">{fmtDate(d.createdAt)}</div>
                    </td>
                    <td>{clients.find((c) => c.id === d.clientId)?.nom ?? "—"}</td>
                    <td className="max-w-xs truncate text-stone-600">{d.objet}</td>
                    <td className="text-right tabular-nums">{fmtNombre(r.quantites.surfaceM2)} m²</td>
                    <td className="text-right tabular-nums">{fmtEuros(r.totaux.totalHT)}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <Badge classe={libelleStatutDevis[d.statut].classe}>{libelleStatutDevis[d.statut].label}</Badge>
                        {bloquant && <Badge classe="bg-rose-100 text-rose-800">Épaisseur</Badge>}
                      </div>
                    </td>
                    <td className="text-stone-600">{fmtDate(d.dateValidite)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
