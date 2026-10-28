import Link from "next/link";
import { getStore } from "@/lib/auth/session";
import { exiger } from "@/lib/auth/roles";
import { fmtDate, fmtEuros, libelleStatutFacture, libelleTypeFacture } from "@/lib/format";
import { Badge, EnTete, Stat, Vide } from "@/components/ui";
import { enregistrerPaiement } from "./actions";

export const metadata = { title: "Factures" };

export default async function Factures({ searchParams }: { searchParams: Promise<{ nouvelle?: string }> }) {
  const { nouvelle } = await searchParams;
  const { session, store } = await getStore();
  exiger(session, "factures");
  const [factures, clients, chantiers] = await Promise.all([store.factures(), store.clients(), store.chantiers()]);
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const reste = (f: (typeof factures)[number]) => Math.round((f.totalTTC - f.paiements.reduce((s, p) => s + p.montant, 0)) * 100) / 100;
  const statutReel = (f: (typeof factures)[number]) => (f.statut === "emise" && f.dateEcheance < aujourdHui ? "en_retard" : f.statut);

  const encours = factures.filter((f) => ["emise", "en_retard"].includes(statutReel(f))).reduce((s, f) => s + reste(f), 0);
  const retard = factures.filter((f) => statutReel(f) === "en_retard").reduce((s, f) => s + reste(f), 0);
  const annee = new Date().getFullYear();
  const caAnnee = factures.filter((f) => f.statut !== "annulee" && f.type !== "avoir" && f.dateEmission.startsWith(String(annee))).reduce((s, f) => s + f.totalHT, 0);

  return (
    <>
      <EnTete titre="Factures" sousTitre={`${factures.length} facture${factures.length > 1 ? "s" : ""}`} />
      {nouvelle && <p className="mb-4 rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900">Facture émise.</p>}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat libelle={`Facturé HT en ${annee}`} valeur={fmtEuros(caAnnee)} />
        <Stat libelle="Encours TTC" valeur={fmtEuros(encours)} />
        <Stat libelle="En retard" valeur={fmtEuros(retard)} detail="Relance à J+7, J+15 et J+30 en V1.1" />
      </div>
      {factures.length === 0 ? (
        <Vide titre="Aucune facture" detail="Les factures d'acompte et de solde s'émettent depuis la fiche chantier." />
      ) : (
        <div className="carte overflow-x-auto">
          <table className="tableau">
            <thead>
              <tr>
                <th>Numéro</th>
                <th>Client</th>
                <th>Type</th>
                <th>Émise</th>
                <th>Échéance</th>
                <th className="text-right">HT</th>
                <th className="text-right">TTC</th>
                <th className="text-right">Reste dû</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {factures.map((f) => {
                const st = statutReel(f);
                const chantier = chantiers.find((c) => c.id === f.chantierId);
                return (
                  <tr key={f.id} className={f.id === nouvelle ? "bg-brand-50" : "hover:bg-stone-50"}>
                    <td>
                      <div className="font-medium">{f.numero}</div>
                      {chantier && (
                        <Link href={`/app/chantiers/${chantier.id}`} className="text-xs text-stone-500 hover:text-brand-700">
                          {chantier.numero}
                        </Link>
                      )}
                    </td>
                    <td>{clients.find((c) => c.id === f.clientId)?.nom ?? "—"}</td>
                    <td>
                      {libelleTypeFacture[f.type]}
                      {f.autoliquidation && <div className="text-xs text-stone-500">Autoliquidation</div>}
                    </td>
                    <td>{fmtDate(f.dateEmission)}</td>
                    <td className={st === "en_retard" ? "text-rose-700" : ""}>{fmtDate(f.dateEcheance)}</td>
                    <td className="text-right tabular-nums">{fmtEuros(f.totalHT)}</td>
                    <td className="text-right tabular-nums">{fmtEuros(f.totalTTC)}</td>
                    <td className="text-right tabular-nums">{fmtEuros(reste(f))}</td>
                    <td>
                      <Badge classe={libelleStatutFacture[st].classe}>{libelleStatutFacture[st].label}</Badge>
                    </td>
                    <td>
                      {reste(f) > 0 && f.statut !== "annulee" && (
                        <form action={enregistrerPaiement.bind(null, f.id)} className="flex items-center gap-1">
                          <input name="montant" type="number" step="0.01" min={0} defaultValue={reste(f)} className="champ w-28 py-1" aria-label="Montant encaissé" />
                          <button type="submit" className="bouton-secondaire py-1">Encaisser</button>
                        </form>
                      )}
                    </td>
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
