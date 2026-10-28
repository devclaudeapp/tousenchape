import Link from "next/link";
import { Plus } from "lucide-react";
import { getStore } from "@/lib/auth/session";
import { exiger } from "@/lib/auth/roles";
import { libelleTypeClient } from "@/lib/format";
import { Badge, EnTete, Vide } from "@/components/ui";

export const metadata = { title: "Clients" };

export default async function Clients() {
  const { session, store } = await getStore();
  exiger(session, "clients");
  const [clients, devis, chantiers] = await Promise.all([store.clients(), store.devisListe(), store.chantiers()]);

  return (
    <>
      <EnTete
        titre="Clients"
        sousTitre={`${clients.length} client${clients.length > 1 ? "s" : ""}`}
        actions={
          <Link href="/app/clients/nouveau" className="bouton-primaire">
            <Plus className="h-4 w-4" aria-hidden /> Nouveau client
          </Link>
        }
      />
      {clients.length === 0 ? (
        <Vide titre="Aucun client" detail="Créez votre premier client pour lui faire un devis." />
      ) : (
        <div className="carte overflow-x-auto">
          <table className="tableau">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Type</th>
                <th>Ville</th>
                <th>Contact</th>
                <th className="text-right">Devis</th>
                <th className="text-right">Chantiers</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-stone-50">
                  <td>
                    <Link href={`/app/clients/${c.id}`} className="font-medium text-stone-900 hover:text-brand-700">
                      {c.nom}
                    </Link>
                    {c.siren && <div className="text-xs text-stone-500">SIREN {c.siren}</div>}
                  </td>
                  <td>
                    <Badge>{libelleTypeClient[c.type]}</Badge>
                  </td>
                  <td>{c.ville ?? "—"}</td>
                  <td className="text-stone-600">
                    {c.email && <div>{c.email}</div>}
                    {c.telephone && <div>{c.telephone}</div>}
                  </td>
                  <td className="text-right tabular-nums">{devis.filter((d) => d.clientId === c.id).length}</td>
                  <td className="text-right tabular-nums">{chantiers.filter((ch) => ch.clientId === c.id).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
