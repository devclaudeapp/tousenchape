import Link from "next/link";
import { getStore } from "@/lib/auth/session";
import { fmtDateLongue, libelleStatutChantier } from "@/lib/format";
import { Badge, EnTete, Vide } from "@/components/ui";

export const metadata = { title: "Planning" };

export default async function Planning() {
  const { store } = await getStore();
  const [chantiers, clients, membres, produits] = await Promise.all([store.chantiers(), store.clients(), store.membres(), store.produits()]);

  const aujourdHui = new Date();
  aujourdHui.setHours(0, 0, 0, 0);
  const jours: Date[] = Array.from({ length: 28 }, (_, i) => new Date(aujourdHui.getTime() + i * 86400000));
  const cle = (d: Date) => d.toISOString().slice(0, 10);
  const planifies = chantiers.filter((c) => c.dateCoulage && !["facture", "clos"].includes(c.statut));
  const sansDate = chantiers.filter((c) => !c.dateCoulage && !["facture", "clos"].includes(c.statut));

  // Conflit : un même chef d'équipe sur deux chantiers le même jour.
  const conflits = new Set<string>();
  for (const a of planifies) for (const b of planifies) if (a.id !== b.id && a.chefEquipeId && a.chefEquipeId === b.chefEquipeId && a.dateCoulage === b.dateCoulage) conflits.add(a.id);

  return (
    <>
      <EnTete titre="Planning des coulages" sousTitre="Quatre semaines à venir, par jour. Les conflits d'équipe sont signalés." />
      {sansDate.length > 0 && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {sansDate.length} chantier{sansDate.length > 1 ? "s" : ""} sans date de coulage :{" "}
          {sansDate.map((c, i) => (
            <span key={c.id}>
              {i > 0 && ", "}
              <Link href={`/app/chantiers/${c.id}`} className="underline">{c.numero}</Link>
            </span>
          ))}
        </p>
      )}
      {planifies.length === 0 ? (
        <Vide titre="Aucun coulage planifié" />
      ) : (
        <div className="grid gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {jours.map((j) => {
            const k = cle(j);
            const duJour = planifies.filter((c) => c.dateCoulage === k);
            const weekend = j.getDay() === 0 || j.getDay() === 6;
            return (
              <div key={k} className={`min-h-28 p-2 ${weekend ? "bg-stone-50" : "bg-white"}`}>
                <div className={`mb-1 text-xs font-medium ${k === cle(aujourdHui) ? "text-brand-700" : "text-stone-500"}`}>
                  {fmtDateLongue(j.toISOString()).replace(/ \d{4}$/, "")}
                </div>
                <ul className="space-y-1">
                  {duJour.map((c) => (
                    <li key={c.id}>
                      <Link href={`/app/chantiers/${c.id}`} className={`block rounded border px-2 py-1 text-xs hover:bg-stone-50 ${conflits.has(c.id) ? "border-rose-300 bg-rose-50" : "border-stone-200"}`}>
                        <div className="font-medium text-stone-900">{c.heurePremierCamion ?? "—"} · {clients.find((x) => x.id === c.clientId)?.nom}</div>
                        <div className="text-stone-500">
                          {c.ville} · {produits.find((p) => p.id === c.produitId)?.nom ?? "produit ?"}
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-1">
                          <span className={c.chefEquipeId ? "text-stone-600" : "text-rose-700"}>{membres.find((m) => m.id === c.chefEquipeId)?.nom ?? "équipe ?"}</span>
                          <Badge classe={libelleStatutChantier[c.statut].classe}>{libelleStatutChantier[c.statut].label}</Badge>
                        </div>
                        {conflits.has(c.id) && <div className="mt-1 text-rose-700">Équipe déjà affectée ce jour</div>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
