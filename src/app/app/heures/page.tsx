import Link from "next/link";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { getStore } from "@/lib/auth/session";
import { estBureau, exiger } from "@/lib/auth/roles";
import { dureeHeures, lundiDe, repartirSemaine } from "@/lib/domain/heures";
import { fmtHeure, fmtNombre } from "@/lib/format";
import { EnTete } from "@/components/ui";
import type { Pointage } from "@/lib/domain/types";
import { ajouterPointage, changerStatutPointage, corrigerPointage, validerSemaineBureau } from "./actions";

export const metadata = { title: "Heures" };

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const decaler = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const heureLocale = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const styleStatut: Record<Pointage["statut"], { label: string; classe: string }> = {
  saisi: { label: "À valider", classe: "bg-amber-100 text-amber-800" },
  valide_chef: { label: "Validé chef", classe: "bg-sky-100 text-sky-800" },
  valide_bureau: { label: "Validé", classe: "bg-brand-100 text-brand-800" },
  refuse: { label: "Refusé", classe: "bg-rose-100 text-rose-800" },
};

export default async function Heures({ searchParams }: { searchParams: Promise<{ semaine?: string; erreur?: string; corriger?: string }> }) {
  const { semaine, erreur, corriger } = await searchParams;
  const { session, store } = await getStore();
  exiger(session, "heures");
  const bureau = estBureau(session);
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const lundi = lundiDe(semaine && /^\d{4}-\d{2}-\d{2}$/.test(semaine) ? semaine : aujourdHui);
  const dimanche = decaler(lundi, 6);
  const jours = Array.from({ length: 7 }, (_, i) => decaler(lundi, i));

  const [membres, equipes, chantiers, clients, pointages] = await Promise.all([store.membres(), store.equipes(), store.chantiers(), store.clients(), store.pointages({ depuis: lundi, jusqua: dimanche })]);
  const visibles = (bureau ? membres : membres.filter((m) => m.equipeId === session.membre.equipeId)).filter((m) => m.actif && m.role !== "bureau");
  const libelleChantier = (id?: string) => {
    const c = chantiers.find((x) => x.id === id);
    return c ? `${clients.find((x) => x.id === c.clientId)?.nom ?? c.numero} · ${c.ville}` : "Dépôt";
  };
  const aValider = pointages.filter((p) => p.fin && (p.statut === "saisi" || (bureau && p.statut === "valide_chef"))).length;
  const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const enCorrection = pointages.find((p) => p.id === corriger);

  return (
    <>
      <EnTete
        titre="Feuille d'heures"
        sousTitre={`Semaine du ${fmt(lundi)} au ${fmt(dimanche)} · ${aValider} pointage${aValider > 1 ? "s" : ""} à valider`}
        actions={
          <>
            <Link href={`/app/heures?semaine=${decaler(lundi, -7)}`} className="bouton-secondaire" aria-label="Semaine précédente"><ChevronLeft className="h-4 w-4" aria-hidden /></Link>
            <Link href="/app/heures" className="bouton-secondaire">Cette semaine</Link>
            <Link href={`/app/heures?semaine=${decaler(lundi, 7)}`} className="bouton-secondaire" aria-label="Semaine suivante"><ChevronRight className="h-4 w-4" aria-hidden /></Link>
            {bureau && (
              <Link href={`/app/heures/paie?mois=${lundi.slice(0, 7)}`} className="bouton-primaire">
                <Download className="h-4 w-4" aria-hidden /> Variables de paie
              </Link>
            )}
          </>
        }
      />
      {erreur && <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{erreur}</p>}

      {enCorrection && (
        <form action={corrigerPointage.bind(null, enCorrection.id)} className="carte mb-6 grid gap-3 border-brand-200 bg-brand-50/60 p-4 sm:grid-cols-6">
          <h2 className="text-sm font-semibold text-brand-900 sm:col-span-6">
            Corriger le pointage de {membres.find((m) => m.id === enCorrection.membreId)?.nom} le {fmt(enCorrection.date)}
          </h2>
          <div><label className="etiquette" htmlFor="c-debut">Début</label><input id="c-debut" name="debut" type="time" defaultValue={heureLocale(enCorrection.debut)} className="champ" /></div>
          <div><label className="etiquette" htmlFor="c-fin">Fin</label><input id="c-fin" name="fin" type="time" defaultValue={enCorrection.fin ? heureLocale(enCorrection.fin) : ""} className="champ" /></div>
          <div><label className="etiquette" htmlFor="c-pause">Pause (min)</label><input id="c-pause" name="pauseMin" type="number" min={0} step={5} defaultValue={enCorrection.pauseMin} className="champ" /></div>
          <div><label className="etiquette" htmlFor="c-zone">Zone trajet</label><input id="c-zone" name="zoneTrajet" type="number" min={0} max={5} defaultValue={enCorrection.zoneTrajet ?? ""} className="champ" placeholder="1 à 5" /></div>
          <div>
            <label className="etiquette" htmlFor="c-chantier">Chantier</label>
            <select id="c-chantier" name="chantierId" defaultValue={enCorrection.chantierId ?? ""} className="champ">
              <option value="">Dépôt</option>
              {chantiers.filter((c) => c.statut !== "clos").map((c) => <option key={c.id} value={c.id}>{libelleChantier(c.id)}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="panier" defaultChecked={enCorrection.panier} /> Panier</label>
            <button type="submit" className="bouton-primaire">Enregistrer</button>
          </div>
        </form>
      )}

      <div className="carte overflow-x-auto">
        <table className="tableau min-w-[900px]">
          <thead>
            <tr>
              <th>Compagnon</th>
              {jours.map((j, i) => (
                <th key={j} className={j === aujourdHui ? "text-brand-800" : i >= 5 ? "text-stone-400" : ""}>
                  {JOURS[i]} {j.slice(8)}/{j.slice(5, 7)}
                </th>
              ))}
              <th className="text-right">Semaine</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((m) => {
              const miens = pointages.filter((p) => p.membreId === m.id);
              const total = miens.filter((p) => p.statut !== "refuse").reduce((s, p) => s + dureeHeures(p), 0);
              const rep = repartirSemaine(total, session.entreprise.parametresPaie);
              const equipe = equipes.find((e) => e.id === m.equipeId);
              return (
                <tr key={m.id} className="align-top">
                  <td>
                    <Link href={`/app/equipe/${m.id}`} className="font-medium text-stone-900 hover:text-brand-700">{m.nom}</Link>
                    <div className="text-xs text-stone-500">{equipe?.nom ?? "—"}</div>
                  </td>
                  {jours.map((j) => {
                    const duJour = miens.filter((p) => p.date === j);
                    return (
                      <td key={j} className="min-w-28">
                        {duJour.length === 0 ? (
                          <span className="text-stone-300">—</span>
                        ) : (
                          <ul className="space-y-1.5">
                            {duJour.map((p) => {
                              const h = dureeHeures(p);
                              const peutValiderChef = (session.membre.role === "chef_equipe" || bureau) && p.statut === "saisi" && p.fin;
                              const peutValiderBureau = bureau && (p.statut === "saisi" || p.statut === "valide_chef") && p.fin;
                              const peutCorriger = bureau || (session.membre.role === "chef_equipe" && p.statut !== "valide_bureau");
                              return (
                                <li key={p.id} className={`rounded border p-1.5 text-xs ${p.statut === "refuse" ? "border-rose-200 bg-rose-50" : "border-stone-200"}`}>
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-medium tabular-nums">{p.fin ? `${fmtNombre(h)} h` : `${fmtHeure(p.debut)} →`}</span>
                                    <span className={`rounded-full px-1.5 py-0.5 ${styleStatut[p.statut].classe}`}>{styleStatut[p.statut].label}</span>
                                  </div>
                                  <div className="truncate text-stone-500" title={libelleChantier(p.chantierId)}>
                                    {fmtHeure(p.debut)}–{p.fin ? fmtHeure(p.fin) : "…"} · {p.type === "depot" ? "Dépôt" : libelleChantier(p.chantierId)}
                                  </div>
                                  <div className="text-stone-400">
                                    {p.panier ? "panier" : ""}{p.zoneTrajet ? ` · zone ${p.zoneTrajet}` : ""}{p.grandDeplacement ? " · GD" : ""}{p.ecartChantierKm !== undefined && p.ecartChantierKm > 1 ? ` · ${p.ecartChantierKm} km du chantier` : ""}
                                  </div>
                                  {p.commentaire && <div className="italic text-stone-500">{p.commentaire}</div>}
                                  {(peutValiderChef || peutValiderBureau || peutCorriger) && p.statut !== "refuse" && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {peutValiderBureau ? (
                                        <form action={changerStatutPointage.bind(null, p.id, "valide_bureau")}><button type="submit" className="rounded bg-brand-700 px-1.5 py-0.5 text-white hover:bg-brand-800">Valider</button></form>
                                      ) : peutValiderChef ? (
                                        <form action={changerStatutPointage.bind(null, p.id, "valide_chef")}><button type="submit" className="rounded bg-sky-700 px-1.5 py-0.5 text-white hover:bg-sky-800">Valider</button></form>
                                      ) : null}
                                      {peutCorriger && <Link href={`/app/heures?semaine=${lundi}&corriger=${p.id}`} className="rounded border border-stone-300 px-1.5 py-0.5 hover:bg-stone-100">Corriger</Link>}
                                      {(peutValiderChef || peutValiderBureau) && (
                                        <form action={changerStatutPointage.bind(null, p.id, "refuse")}><button type="submit" className="rounded border border-rose-300 px-1.5 py-0.5 text-rose-700 hover:bg-rose-50">Refuser</button></form>
                                      )}
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </td>
                    );
                  })}
                  <td className="text-right tabular-nums">
                    <div className="font-semibold">{fmtNombre(total)} h</div>
                    {rep.sup25 > 0 && <div className="text-xs text-amber-700">+{fmtNombre(rep.sup25)} h à 25 %</div>}
                    {rep.sup50 > 0 && <div className="text-xs text-rose-700">+{fmtNombre(rep.sup50)} h à 50 %</div>}
                    <div className="text-xs text-stone-500">{miens.filter((p) => p.panier && p.statut !== "refuse").length} panier{miens.filter((p) => p.panier).length > 1 ? "s" : ""}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {bureau && aValider > 0 && (
          <form action={validerSemaineBureau.bind(null, lundi, visibles.map((m) => m.id))} className="carte flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-stone-700">Valider d&apos;un coup les {aValider} pointages terminés de la semaine (ceux marqués « À valider » ou « Validé chef »).</p>
            <button type="submit" className="bouton-primaire">Valider la semaine</button>
          </form>
        )}
        <form action={ajouterPointage} className="carte grid gap-3 p-4 sm:grid-cols-4">
          <h2 className="text-sm font-semibold text-stone-800 sm:col-span-4">Ajouter un pointage (oubli, correction)</h2>
          <div>
            <label className="etiquette" htmlFor="a-membre">Compagnon</label>
            <select id="a-membre" name="membreId" className="champ" required>
              {visibles.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
          </div>
          <div><label className="etiquette" htmlFor="a-date">Date</label><input id="a-date" name="date" type="date" defaultValue={aujourdHui <= dimanche && aujourdHui >= lundi ? aujourdHui : lundi} className="champ" required /></div>
          <div><label className="etiquette" htmlFor="a-debut">Début</label><input id="a-debut" name="debut" type="time" defaultValue="07:30" className="champ" required /></div>
          <div><label className="etiquette" htmlFor="a-fin">Fin</label><input id="a-fin" name="fin" type="time" defaultValue="16:30" className="champ" /></div>
          <div>
            <label className="etiquette" htmlFor="a-chantier">Lieu</label>
            <select id="a-chantier" name="chantierId" className="champ">
              <option value="">Dépôt</option>
              {chantiers.filter((c) => c.statut !== "clos").map((c) => <option key={c.id} value={c.id}>{libelleChantier(c.id)}</option>)}
            </select>
          </div>
          <div><label className="etiquette" htmlFor="a-pause">Pause (min)</label><input id="a-pause" name="pauseMin" type="number" min={0} step={5} defaultValue={45} className="champ" /></div>
          <div><label className="etiquette" htmlFor="a-zone">Zone trajet</label><input id="a-zone" name="zoneTrajet" type="number" min={0} max={5} className="champ" placeholder="1 à 5" /></div>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="panier" defaultChecked /> Panier</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="grandDeplacement" /> GD</label>
          </div>
          <div className="sm:col-span-3"><input name="commentaire" className="champ" placeholder="Commentaire" /></div>
          <div className="flex items-end"><button type="submit" className="bouton-secondaire w-full">Ajouter</button></div>
        </form>
      </div>
    </>
  );
}
