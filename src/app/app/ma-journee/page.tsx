import Link from "next/link";
import { ClipboardCheck, MapPin, MessageSquareWarning, Phone, Truck } from "lucide-react";
import { getStore } from "@/lib/auth/session";
import { exiger } from "@/lib/auth/roles";
import { indisponibleLe } from "@/lib/domain/alertes";
import { fmtDateLongue, libelleStatutChantier } from "@/lib/format";
import { Badge } from "@/components/ui";
import type { Chantier, Client, Message, Produit } from "@/lib/domain/types";

function CarteChantier({ c, principal, clients, produits, messages }: { c: Chantier; principal?: boolean; clients: Client[]; produits: Produit[]; messages: Message[] }) {
  const client = clients.find((x) => x.id === c.clientId);
  const produit = produits.find((p) => p.id === c.produitId);
  const destination = encodeURIComponent(`${c.adresse}, ${c.codePostal} ${c.ville}`);
  const nbMessages = messages.filter((m) => m.chantierId === c.id).length;
  return (
    <article className={`carte p-4 ${principal ? "border-brand-300 ring-1 ring-brand-200" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-stone-900">{client?.nom ?? "Client"}</h2>
          <p className="text-sm text-stone-600">
            {c.adresse}, {c.codePostal} {c.ville}
          </p>
        </div>
        <Badge classe={libelleStatutChantier[c.statut].classe}>{libelleStatutChantier[c.statut].label}</Badge>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-stone-500">Premier camion</dt>
        <dd className="text-right text-lg font-semibold tabular-nums">{c.heurePremierCamion ?? "—"}</dd>
        <dt className="text-stone-500">Produit</dt>
        <dd className="text-right">{produit?.nom ?? "—"}</dd>
        {c.surfacePrevueM2 && (
          <>
            <dt className="text-stone-500">Surface</dt>
            <dd className="text-right">{c.surfacePrevueM2} m²</dd>
          </>
        )}
        {c.distancePompageM && (
          <>
            <dt className="text-stone-500">Pompage</dt>
            <dd className="text-right">
              {c.distancePompageM} m{c.etage ? `, étage ${c.etage}` : ""}
            </dd>
          </>
        )}
      </dl>
      {c.accesCamion && <p className="mt-3 rounded-md bg-stone-50 px-3 py-2 text-sm text-stone-700">{c.accesCamion}</p>}
      {c.renforts && c.renforts.length > 0 && <p className="mt-2 text-sm text-stone-600">Renfort : {c.renforts.map((r) => r.nom).join(", ")}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${destination}`} target="_blank" rel="noopener" className="bouton-secondaire min-h-12">
          <MapPin className="h-5 w-5" aria-hidden /> Itinéraire
        </a>
        {client?.telephone ? (
          <a href={`tel:${client.telephone}`} className="bouton-secondaire min-h-12">
            <Phone className="h-5 w-5" aria-hidden /> Appeler le client
          </a>
        ) : (
          <span className="bouton-secondaire min-h-12 opacity-50">
            <Phone className="h-5 w-5" aria-hidden /> Pas de téléphone
          </span>
        )}
        <Link href={`/app/chantiers/${c.id}${c.statut === "planifie" || c.statut === "preparation" ? "?visite=1#controles" : "#livraisons"}`} className="bouton-primaire min-h-12">
          {c.statut === "planifie" || c.statut === "preparation" ? (
            <>
              <ClipboardCheck className="h-5 w-5" aria-hidden /> Visite technique
            </>
          ) : (
            <>
              <Truck className="h-5 w-5" aria-hidden /> Saisir une toupie
            </>
          )}
        </Link>
        <Link href={`/app/chantiers/${c.id}#fil`} className="bouton-secondaire min-h-12">
          <MessageSquareWarning className="h-5 w-5" aria-hidden /> Signaler{nbMessages > 0 ? ` (${nbMessages})` : ""}
        </Link>
      </div>
    </article>
  );
}


export const metadata = { title: "Ma journée" };

const decaler = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export default async function MaJournee() {
  const { session, store } = await getStore();
  exiger(session, "ma_journee");
  const [chantiers, clients, produits, membres, equipes, indispos, messages] = await Promise.all([
    store.chantiers(),
    store.clients(),
    store.produits(),
    store.membres(),
    store.equipes(),
    store.indisponibilites(),
    store.messages(),
  ]);
  const moi = session.membre;
  const terrain = moi.role === "chef_equipe" || moi.role === "applicateur";
  const equipe = equipes.find((e) => e.id === moi.equipeId);
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const demain = decaler(aujourdHui, 1);

  // Un chef ou un applicateur voit les chantiers de son équipe ; le bureau voit tout.
  const mesChantiers = chantiers.filter((c) => !["facture", "clos"].includes(c.statut) && (!terrain || (equipe ? c.equipeId === equipe.id : c.chefEquipeId === moi.id)));
  const duJour = mesChantiers.filter((c) => c.dateCoulage === aujourdHui);
  const deDemain = mesChantiers.filter((c) => c.dateCoulage === demain);
  const suivants = mesChantiers.filter((c) => c.dateCoulage && c.dateCoulage > demain).slice(0, 3);
  const coequipiers = equipe ? membres.filter((m) => m.equipeId === equipe.id && m.actif && m.id !== moi.id) : [];
  const monAbsence = indisponibleLe(indispos, moi.id, aujourdHui);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold text-stone-900">Bonjour {moi.nom.split(" ")[0]}</h1>
      <p className="text-sm capitalize text-stone-500">{fmtDateLongue(new Date().toISOString())}</p>
      {monAbsence && <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Vous êtes noté absent aujourd&apos;hui ({monAbsence.motif}).</p>}

      <section className="mt-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Aujourd&apos;hui</h2>
        {duJour.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-300 p-6 text-center text-sm text-stone-500">Aucun coulage prévu aujourd&apos;hui{equipe ? ` pour ${equipe.nom}` : ""}.</p>
        ) : (
          <div className="space-y-4">
            {duJour.map((c) => (
              <CarteChantier key={c.id} c={c} principal clients={clients} produits={produits} messages={messages} />
            ))}
          </div>
        )}
      </section>

      {deDemain.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Demain</h2>
          <div className="space-y-4">
            {deDemain.map((c) => (
              <CarteChantier key={c.id} c={c} clients={clients} produits={produits} messages={messages} />
            ))}
          </div>
        </section>
      )}

      {suivants.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Ensuite</h2>
          <ul className="carte divide-y divide-stone-100">
            {suivants.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <Link href={`/app/chantiers/${c.id}`} className="font-medium text-stone-900 hover:text-brand-700">
                  {clients.find((x) => x.id === c.clientId)?.nom} · {c.ville}
                </Link>
                <span className="text-stone-500">
                  {new Date(`${c.dateCoulage}T00:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} {c.heurePremierCamion ?? ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {equipe && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">{equipe.nom} aujourd&apos;hui</h2>
          <ul className="carte divide-y divide-stone-100">
            {coequipiers.map((m) => {
              const absent = indisponibleLe(indispos, m.id, aujourdHui);
              return (
                <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>
                    {m.nom}
                    {m.id === equipe.chefId && <span className="text-xs text-stone-400"> · chef</span>}
                  </span>
                  {absent ? <Badge classe="bg-amber-100 text-amber-800">Absent · {absent.motif}</Badge> : m.telephone ? <a href={`tel:${m.telephone}`} className="text-brand-700 hover:underline">{m.telephone}</a> : <Badge classe="bg-brand-100 text-brand-800">Présent</Badge>}
                </li>
              );
            })}
            {coequipiers.length === 0 && <li className="px-4 py-3 text-sm text-stone-500">Vous êtes seul dans cette équipe.</li>}
          </ul>
          <Link href={`/app/equipe/${moi.id}#indisponibilites`} className="bouton-discret mt-2 w-full">
            Poser une absence
          </Link>
        </section>
      )}
    </div>
  );
}
