import Link from "next/link";
import { Plus } from "lucide-react";
import { getStore } from "@/lib/auth/session";
import { estBureau, exiger } from "@/lib/auth/roles";
import { etatValidite, libelleContrat, libelleMotif } from "@/lib/domain/habilitations";
import { fmtDate } from "@/lib/format";
import { Badge, Carte, EnTete, Stat } from "@/components/ui";
import { enregistrerEquipe } from "./actions";

export const metadata = { title: "Équipe" };

const libelleRole = { gerant: "Gérant", bureau: "Bureau", chef_equipe: "Chef d'équipe", applicateur: "Applicateur" } as const;

export default async function Equipe() {
  const { session, store } = await getStore();
  exiger(session, "equipe");
  const [membres, equipes, indisponibilites] = await Promise.all([store.membres(), store.equipes(), store.indisponibilites()]);
  const bureau = estBureau(session);
  const aujourdHui = new Date();
  const jour = aujourdHui.toISOString().slice(0, 10);

  // Un chef voit son équipe ; un applicateur se voit lui-même.
  const visibles = bureau ? membres : session.membre.role === "chef_equipe" ? membres.filter((m) => m.equipeId === session.membre.equipeId || m.id === session.membre.id) : membres.filter((m) => m.id === session.membre.id);
  const actifs = visibles.filter((m) => m.actif);

  const etatMembre = (m: (typeof membres)[number]) => {
    let expirees = 0;
    let bientot = 0;
    for (const h of m.habilitations) {
      const e = etatValidite(h.dateFin, aujourdHui).etat;
      if (e === "expiree") expirees++;
      else if (e === "expire_bientot") bientot++;
    }
    return { expirees, bientot };
  };
  const totalExpirees = actifs.reduce((s, m) => s + etatMembre(m).expirees, 0);
  const totalBientot = actifs.reduce((s, m) => s + etatMembre(m).bientot, 0);
  const absentsAujourdHui = indisponibilites.filter((i) => i.debut <= jour && i.fin >= jour);
  const aVenir = indisponibilites.filter((i) => i.fin >= jour).slice(0, 8);

  return (
    <>
      <EnTete
        titre="Équipe"
        sousTitre={`${actifs.length} compagnon${actifs.length > 1 ? "s" : ""} actif${actifs.length > 1 ? "s" : ""} · ${equipes.length} équipe${equipes.length > 1 ? "s" : ""}`}
        actions={
          bureau && (
            <Link href="/app/equipe/nouveau" className="bouton-primaire">
              <Plus className="h-4 w-4" aria-hidden /> Nouveau compagnon
            </Link>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat libelle="Titulaires du CQP chapiste" valeur={actifs.filter((m) => m.cqpNumero).length} detail={`sur ${actifs.filter((m) => m.role === "chef_equipe" || m.role === "gerant").length} chef${actifs.filter((m) => m.role === "chef_equipe").length > 1 ? "s" : ""} d'équipe`} accent />
        <Stat libelle="Habilitations expirées" valeur={totalExpirees} detail={totalBientot > 0 ? `${totalBientot} à renouveler sous 60 jours` : "Rien à renouveler sous 60 jours"} />
        <Stat libelle="Absents aujourd'hui" valeur={absentsAujourdHui.length} detail={absentsAujourdHui.map((i) => membres.find((m) => m.id === i.membreId)?.nom.split(" ")[0]).join(", ") || "Équipe au complet"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="carte overflow-x-auto">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Compagnon</th>
                  <th>Rôle</th>
                  <th>Équipe</th>
                  <th>Contrat</th>
                  <th>CQP</th>
                  <th>Habilitations</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((m) => {
                  const e = etatMembre(m);
                  const equipe = equipes.find((x) => x.id === m.equipeId);
                  return (
                    <tr key={m.id} className={`hover:bg-stone-50 ${m.actif ? "" : "opacity-50"}`}>
                      <td>
                        <Link href={`/app/equipe/${m.id}`} className="font-medium text-stone-900 hover:text-brand-700">
                          {m.nom}
                        </Link>
                        <div className="text-xs text-stone-500">{m.telephone ?? m.email}</div>
                      </td>
                      <td>{libelleRole[m.role]}</td>
                      <td>
                        {equipe ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: equipe.couleur }} aria-hidden /> {equipe.nom}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="text-stone-600">
                        {m.typeContrat ? libelleContrat[m.typeContrat] : "—"}
                        {m.dateEntree && <div className="text-xs text-stone-400">depuis {fmtDate(m.dateEntree)}</div>}
                      </td>
                      <td>
                        {m.cqpNumero ? <Badge classe="bg-brand-100 text-brand-800">CQP {m.cqpNumero}</Badge> : m.role === "chef_equipe" ? <Badge classe="bg-rose-100 text-rose-800">Manquant</Badge> : <span className="text-stone-400">—</span>}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {e.expirees > 0 && <Badge classe="bg-rose-100 text-rose-800">{e.expirees} expirée{e.expirees > 1 ? "s" : ""}</Badge>}
                          {e.bientot > 0 && <Badge classe="bg-amber-100 text-amber-800">{e.bientot} à renouveler</Badge>}
                          {e.expirees === 0 && e.bientot === 0 && <Badge classe="bg-stone-100 text-stone-600">{m.habilitations.length} à jour</Badge>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Carte titre="Absences à venir">
            {aVenir.length === 0 ? (
              <p className="text-sm text-stone-500">Aucune absence enregistrée.</p>
            ) : (
              <ul className="divide-y divide-stone-100 text-sm">
                {aVenir.map((i) => {
                  const m = membres.find((x) => x.id === i.membreId);
                  return (
                    <li key={i.id} className="flex items-center justify-between py-2">
                      <span>
                        <Link href={`/app/equipe/${i.membreId}`} className="font-medium hover:text-brand-700">{m?.nom ?? "—"}</Link>
                        <span className="ml-2 text-stone-500">
                          {i.debut === i.fin ? `le ${fmtDate(i.debut)}` : `du ${fmtDate(i.debut)} au ${fmtDate(i.fin)}`}
                        </span>
                      </span>
                      <Badge>{libelleMotif[i.motif]}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-3 text-xs text-stone-500">Les absences se saisissent depuis la fiche du compagnon. Le circuit demande → validation arrive avec les heures en V1.</p>
          </Carte>
        </div>

        <div className="space-y-6">
          <div id="equipes" />
          {equipes.map((eq) => {
            const chef = membres.find((m) => m.id === eq.chefId);
            const effectif = membres.filter((m) => m.equipeId === eq.id && m.actif);
            return (
              <Carte
                key={eq.id}
                titre={
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: eq.couleur }} aria-hidden /> {eq.nom}
                  </span>
                }
              >
                <p className="text-sm text-stone-700">
                  Chef : {chef ? chef.nom : <span className="text-rose-700">à désigner</span>}
                  {chef && !chef.cqpNumero && <span className="text-rose-700"> (sans CQP)</span>} · {effectif.length} personne{effectif.length > 1 ? "s" : ""} · {eq.capaciteM2Jour} m²/jour
                </p>
                <ul className="mt-2 text-sm text-stone-600">
                  {effectif.map((m) => (
                    <li key={m.id}>
                      <Link href={`/app/equipe/${m.id}`} className="hover:text-brand-700">{m.nom}</Link>
                      {m.id === eq.chefId && <span className="text-xs text-stone-400"> · chef</span>}
                    </li>
                  ))}
                </ul>
                {bureau && (
                  <form action={enregistrerEquipe.bind(null, eq.id)} className="mt-3 grid gap-2 border-t border-stone-100 pt-3 sm:grid-cols-2">
                    <input name="nom" defaultValue={eq.nom} className="champ" aria-label="Nom de l'équipe" />
                    <select name="chefId" defaultValue={eq.chefId ?? ""} className="champ" aria-label="Chef d'équipe">
                      <option value="">Chef à désigner</option>
                      {membres.filter((m) => m.actif && (m.role === "chef_equipe" || m.role === "gerant")).map((m) => (
                        <option key={m.id} value={m.id}>{m.nom}{m.cqpNumero ? "" : " (sans CQP)"}</option>
                      ))}
                    </select>
                    <input name="capaciteM2Jour" type="number" min={50} step={10} defaultValue={eq.capaciteM2Jour} className="champ" aria-label="Capacité m² par jour" />
                    <div className="flex gap-2">
                      <input name="couleur" type="color" defaultValue={eq.couleur} className="h-9 w-12 rounded border border-stone-300" aria-label="Couleur" />
                      <button type="submit" className="bouton-secondaire flex-1">Enregistrer</button>
                    </div>
                  </form>
                )}
              </Carte>
            );
          })}
          {bureau && (
            <Carte titre="Nouvelle équipe">
              <form action={enregistrerEquipe.bind(null, null)} className="grid gap-2 sm:grid-cols-2">
                <input name="nom" placeholder="Équipe 3" required className="champ" aria-label="Nom" />
                <select name="chefId" defaultValue="" className="champ" aria-label="Chef d'équipe">
                  <option value="">Chef à désigner</option>
                  {membres.filter((m) => m.actif && (m.role === "chef_equipe" || m.role === "gerant")).map((m) => (
                    <option key={m.id} value={m.id}>{m.nom}</option>
                  ))}
                </select>
                <input name="capaciteM2Jour" type="number" min={50} step={10} defaultValue={250} className="champ" aria-label="Capacité m² par jour" />
                <div className="flex gap-2">
                  <input name="couleur" type="color" defaultValue="#2563eb" className="h-9 w-12 rounded border border-stone-300" aria-label="Couleur" />
                  <button type="submit" className="bouton-primaire flex-1">Créer</button>
                </div>
              </form>
            </Carte>
          )}
        </div>
      </div>
    </>
  );
}
