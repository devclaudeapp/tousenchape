import Link from "next/link";
import { Mail, MapPin, Trash2 } from "lucide-react";
import { getStore } from "@/lib/auth/session";
import { estBureau, exiger } from "@/lib/auth/roles";
import { fmtDateLongue } from "@/lib/format";
import type { TypeRendezVous } from "@/lib/domain/types";
import { Badge, Carte, EnTete } from "@/components/ui";
import { creerRendezVous, marquerRappelEnvoye, supprimerRendezVous } from "./actions";

export const metadata = { title: "Agenda" };

const libelleType: Record<TypeRendezVous, string> = { visite_technique: "Visite technique", metre: "Métré", rdv_client: "Rendez-vous client", autre: "Autre" };
const decaler = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Texte du rappel J-1 envoyé au client avant un coulage : ce qu'il doit préparer. */
function texteRappelCoulage(input: { client: string; adresse: string; date: string; heure?: string; entreprise: string; telephone?: string }) {
  return `Bonjour,

Nous intervenons demain ${fmtDateLongue(input.date + "T00:00:00")} à ${input.adresse} pour le coulage de la chape fluide. Le premier camion est prévu à ${input.heure ?? "7 h 30"}.

Pour que tout se passe bien, merci de vérifier avant notre arrivée :
- le bâtiment est clos et couvert, les vitrages posés ou les baies bâchées ;
- aucun courant d'air possible pendant les 24 heures qui suivent le coulage, fenêtres masquées du soleil ;
- l'accès est libre pour une toupie (largeur 3,5 m, hauteur 4 m) et le stationnement possible devant ;
- un point d'eau et une prise électrique sont disponibles ;
- aucun autre corps d'état ne travaille dans les pièces coulées ce jour-là ni les 72 heures suivantes (les cloisons légères attendent 7 jours) ;
- en cas de plancher chauffant, le chauffage est à l'arrêt.

Nous vous recontacterons après le coulage pour les délais de séchage et la mesure d'humidité avant la pose de votre revêtement.

Cordialement,
${input.entreprise}${input.telephone ? ` · ${input.telephone}` : ""}`;
}

export default async function Agenda({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  const { session, store } = await getStore();
  exiger(session, "agenda");
  const bureau = estBureau(session);
  const [rdvs, chantiers, clients, membres] = await Promise.all([store.rendezVous(), store.chantiers(), store.clients(), store.membres()]);
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const jours = Array.from({ length: 14 }, (_, i) => decaler(aujourdHui, i));
  const demain = decaler(aujourdHui, 1);
  const coulagesDemain = chantiers.filter((c) => c.dateCoulage === demain && !["facture", "clos"].includes(c.statut));

  return (
    <>
      <EnTete titre="Agenda du bureau" sousTitre="Visites techniques, métrés, rendez-vous et coulages des quatorze prochains jours." />
      {erreur && <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{erreur}</p>}

      {coulagesDemain.length > 0 && (
        <Carte titre={`Rappel J-1 · ${coulagesDemain.length} coulage${coulagesDemain.length > 1 ? "s" : ""} demain`} classe="mb-6 border-brand-200">
          <ul className="divide-y divide-stone-100">
            {coulagesDemain.map((c) => {
              const client = clients.find((x) => x.id === c.clientId);
              const texte = texteRappelCoulage({ client: client?.nom ?? "", adresse: `${c.adresse}, ${c.codePostal} ${c.ville}`, date: demain, heure: c.heurePremierCamion, entreprise: session.entreprise.nom, telephone: session.entreprise.telephone });
              const mailto = `mailto:${client?.email ?? ""}?subject=${encodeURIComponent(`Coulage de la chape demain — ${c.adresse}`)}&body=${encodeURIComponent(texte)}`;
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={`/app/chantiers/${c.id}`} className="font-medium text-stone-900 hover:text-brand-700">{client?.nom} · {c.ville}</Link>
                    <div className="text-xs text-stone-500">Premier camion {c.heurePremierCamion ?? "—"} · {client?.email ?? "pas d'e-mail client"}{client?.telephone ? ` · ${client.telephone}` : ""}</div>
                  </div>
                  <a href={mailto} className="bouton-primaire"><Mail className="h-4 w-4" aria-hidden /> Envoyer le rappel (accès, eau, courants d&apos;air)</a>
                </li>
              );
            })}
          </ul>
        </Carte>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {jours.map((j) => {
            const duJour = rdvs.filter((r) => r.date === j);
            const coulages = chantiers.filter((c) => c.dateCoulage === j && !["facture", "clos"].includes(c.statut));
            if (duJour.length === 0 && coulages.length === 0) return null;
            return (
              <section key={j}>
                <h2 className={`mb-1 text-xs font-semibold uppercase tracking-wide ${j === aujourdHui ? "text-brand-800" : "text-stone-500"}`}>{j === aujourdHui ? "Aujourd'hui · " : j === demain ? "Demain · " : ""}{fmtDateLongue(j + "T00:00:00")}</h2>
                <ul className="carte divide-y divide-stone-100">
                  {coulages.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-12 tabular-nums text-stone-500">{c.heurePremierCamion ?? "—"}</span>
                        <Badge classe="bg-brand-100 text-brand-800">Coulage</Badge>
                        <Link href={`/app/chantiers/${c.id}`} className="font-medium hover:text-brand-700">{clients.find((x) => x.id === c.clientId)?.nom} · {c.ville}</Link>
                      </span>
                      <span className="text-xs text-stone-500">{membres.find((m) => m.id === c.chefEquipeId)?.nom ?? "équipe ?"}</span>
                    </li>
                  ))}
                  {duJour.map((r) => {
                    const client = clients.find((x) => x.id === r.clientId);
                    const destination = encodeURIComponent(r.adresse ?? "");
                    return (
                      <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-sm">
                        <span className="flex items-center gap-2">
                          <span className="w-12 tabular-nums text-stone-500">{r.heure}</span>
                          <Badge>{libelleType[r.type]}</Badge>
                          <span className="font-medium">{client?.nom ?? r.adresse ?? "—"}</span>
                          {r.notes && <span className="text-stone-500">· {r.notes}</span>}
                        </span>
                        <span className="flex items-center gap-2 text-xs text-stone-500">
                          {membres.find((m) => m.id === r.membreId)?.nom}
                          {r.adresse && <a href={`https://www.google.com/maps/dir/?api=1&destination=${destination}`} target="_blank" rel="noopener" className="bouton-discret p-1.5" aria-label="Itinéraire"><MapPin className="h-4 w-4" aria-hidden /></a>}
                          {bureau && client?.email && !r.rappelEnvoyeLe && (
                            <form action={marquerRappelEnvoye.bind(null, r.id)}>
                              <a href={`mailto:${client.email}?subject=${encodeURIComponent(`Rendez-vous ${libelleType[r.type].toLowerCase()} le ${fmtDateLongue(r.date + "T00:00:00")} à ${r.heure}`)}&body=${encodeURIComponent(`Bonjour,\n\nNous confirmons notre passage le ${fmtDateLongue(r.date + "T00:00:00")} à ${r.heure}${r.adresse ? ` à ${r.adresse}` : ""}.\n\nCordialement,\n${session.entreprise.nom}`)}`} className="bouton-discret p-1.5" aria-label="Confirmer par e-mail"><Mail className="h-4 w-4" aria-hidden /></a>
                            </form>
                          )}
                          {bureau && (
                            <form action={supprimerRendezVous.bind(null, r.id)}>
                              <button type="submit" className="bouton-discret p-1.5" aria-label="Supprimer"><Trash2 className="h-4 w-4" aria-hidden /></button>
                            </form>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
          {rdvs.filter((r) => r.date >= aujourdHui).length === 0 && chantiers.filter((c) => c.dateCoulage && c.dateCoulage >= aujourdHui).length === 0 && <p className="text-sm text-stone-500">Rien de prévu sur quatorze jours.</p>}
        </div>

        {bureau && (
          <Carte titre="Nouveau rendez-vous">
            <form action={creerRendezVous} className="space-y-3">
              <div>
                <label className="etiquette" htmlFor="type">Type</label>
                <select id="type" name="type" className="champ" defaultValue="visite_technique">
                  {(Object.keys(libelleType) as TypeRendezVous[]).map((t) => <option key={t} value={t}>{libelleType[t]}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><label className="etiquette" htmlFor="date">Date</label><input id="date" name="date" type="date" required className="champ" /></div>
                <div><label className="etiquette" htmlFor="heure">Heure</label><input id="heure" name="heure" type="time" required defaultValue="09:00" className="champ" /></div>
              </div>
              <div>
                <label className="etiquette" htmlFor="clientId">Client</label>
                <select id="clientId" name="clientId" className="champ" defaultValue="">
                  <option value="">—</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="etiquette" htmlFor="chantierId">Chantier</label>
                <select id="chantierId" name="chantierId" className="champ" defaultValue="">
                  <option value="">—</option>
                  {chantiers.filter((c) => c.statut !== "clos").map((c) => <option key={c.id} value={c.id}>{c.numero} · {c.ville}</option>)}
                </select>
              </div>
              <div>
                <label className="etiquette" htmlFor="membreId">Qui y va</label>
                <select id="membreId" name="membreId" className="champ" defaultValue={session.membre.id}>
                  {membres.filter((m) => m.actif && m.role !== "applicateur").map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </select>
              </div>
              <div><label className="etiquette" htmlFor="adresse">Adresse</label><input id="adresse" name="adresse" className="champ" /></div>
              <div><label className="etiquette" htmlFor="dureeMin">Durée (min)</label><input id="dureeMin" name="dureeMin" type="number" min={15} step={15} defaultValue={60} className="champ" /></div>
              <div><label className="etiquette" htmlFor="notes">Notes</label><input id="notes" name="notes" className="champ" /></div>
              <button type="submit" className="bouton-primaire w-full">Ajouter à l&apos;agenda</button>
            </form>
          </Carte>
        )}
      </div>
    </>
  );
}
