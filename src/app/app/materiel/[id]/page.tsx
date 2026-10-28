import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { getStore } from "@/lib/auth/session";
import { estBureau, exiger } from "@/lib/auth/roles";
import { etatValidite } from "@/lib/domain/habilitations";
import { PERIODICITE_MOIS, libelleTypeControle, libelleTypeMateriel } from "@/lib/domain/materiel";
import { fmtDate } from "@/lib/format";
import type { TypeControleMateriel, TypeMateriel } from "@/lib/domain/types";
import { Badge, Carte, Definition, EnTete } from "@/components/ui";
import { ajouterControle, enregistrerMateriel, supprimerControle } from "../actions";

const TYPES: TypeMateriel[] = ["pompe", "malaxeur", "camion", "laser", "bombe_cm", "autre"];
const TYPES_CONTROLE: TypeControleMateriel[] = ["vgp", "entretien", "controle_technique", "etalonnage", "autre"];

export default async function FicheMateriel({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, store } = await getStore();
  exiger(session, "materiel");
  const [materiels, equipes, chantiers] = await Promise.all([store.materiels(), store.equipes(), store.chantiers()]);
  const m = materiels.find((x) => x.id === id);
  if (!m) notFound();
  const aujourdHui = new Date();
  const peutEcrire = estBureau(session) || session.membre.role === "chef_equipe";
  const historique = chantiers.filter((c) => c.materielIds?.includes(id)).sort((a, b) => (b.dateCoulage ?? "").localeCompare(a.dateCoulage ?? "")).slice(0, 8);

  return (
    <>
      <EnTete
        titre={
          <span className="flex items-center gap-3">
            {m.nom}
            {!m.actif && <Badge classe="bg-stone-200 text-stone-600">Hors service</Badge>}
          </span>
        }
        sousTitre={`${libelleTypeMateriel[m.type]}${m.immatriculation ? ` · ${m.immatriculation}` : ""}${m.numeroSerie ? ` · n° ${m.numeroSerie}` : ""}`}
        actions={<Link href="/app/materiel" className="bouton-secondaire">Tout le matériel</Link>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Carte titre="Contrôles et entretien" classe="scroll-mt-6">
            <div id="controles" />
            {m.controles.length === 0 ? (
              <p className="text-sm text-stone-500">Aucun contrôle enregistré. Une pompe ou un malaxeur relèvent de la vérification générale périodique ; un véhicule, du contrôle technique.</p>
            ) : (
              <table className="tableau">
                <thead>
                  <tr>
                    <th>Contrôle</th>
                    <th>Fait le</th>
                    <th>Prochain</th>
                    <th>État</th>
                    {estBureau(session) && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {[...m.controles].sort((a, b) => (a.prochaineDate ?? "9999").localeCompare(b.prochaineDate ?? "9999")).map((c) => {
                    const { etat, joursRestants } = etatValidite(c.prochaineDate, aujourdHui, 30);
                    return (
                      <tr key={c.id}>
                        <td>
                          {c.libelle ?? libelleTypeControle[c.type]}
                          {c.commentaire && <div className="text-xs text-stone-500">{c.commentaire}</div>}
                        </td>
                        <td>{fmtDate(c.dateFait)}</td>
                        <td>{fmtDate(c.prochaineDate)}</td>
                        <td>
                          {etat === "expiree" ? <Badge classe="bg-rose-100 text-rose-800">En retard de {Math.abs(joursRestants ?? 0)} j</Badge> : etat === "expire_bientot" ? <Badge classe="bg-amber-100 text-amber-800">Dans {joursRestants} j</Badge> : etat === "valide" ? <Badge classe="bg-brand-100 text-brand-800">À jour</Badge> : <Badge>—</Badge>}
                        </td>
                        {estBureau(session) && (
                          <td>
                            <form action={supprimerControle.bind(null, id, c.id)}>
                              <button type="submit" className="bouton-discret p-1.5" aria-label="Supprimer"><Trash2 className="h-4 w-4" aria-hidden /></button>
                            </form>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {peutEcrire && (
              <form action={ajouterControle.bind(null, id)} className="mt-4 grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-3 sm:grid-cols-3">
                <h3 className="text-sm font-semibold text-stone-800 sm:col-span-3">Enregistrer un contrôle</h3>
                <div>
                  <label className="etiquette" htmlFor="ctype">Type</label>
                  <select id="ctype" name="type" className="champ" defaultValue={m.type === "camion" ? "controle_technique" : m.type === "laser" || m.type === "bombe_cm" ? "etalonnage" : "vgp"}>
                    {TYPES_CONTROLE.map((t) => <option key={t} value={t}>{libelleTypeControle[t]} · tous les {PERIODICITE_MOIS[t]} mois</option>)}
                  </select>
                </div>
                <div><label className="etiquette" htmlFor="libelle">Libellé</label><input id="libelle" name="libelle" className="champ" /></div>
                <div><label className="etiquette" htmlFor="dateFait">Fait le</label><input id="dateFait" name="dateFait" type="date" className="champ" defaultValue={aujourdHui.toISOString().slice(0, 10)} /></div>
                <div><label className="etiquette" htmlFor="prochaineDate">Prochain (sinon calculé)</label><input id="prochaineDate" name="prochaineDate" type="date" className="champ" /></div>
                <div className="sm:col-span-2"><label className="etiquette" htmlFor="commentaire">Commentaire</label><input id="commentaire" name="commentaire" className="champ" placeholder="Organisme, pièces changées…" /></div>
                <div className="sm:col-span-3"><button type="submit" className="bouton-primaire">Enregistrer</button></div>
              </form>
            )}
          </Carte>

          <Carte titre="Chantiers où ce matériel a été affecté">
            {historique.length === 0 ? <p className="text-sm text-stone-500">Aucune affectation. Le matériel s&apos;affecte depuis le planning d&apos;un chantier.</p> : (
              <ul className="divide-y divide-stone-100 text-sm">
                {historique.map((c) => (
                  <li key={c.id} className="flex justify-between py-2">
                    <Link href={`/app/chantiers/${c.id}`} className="font-medium hover:text-brand-700">{c.numero} · {c.ville}</Link>
                    <span className="text-stone-500">{fmtDate(c.dateCoulage)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Carte>
        </div>

        <div className="space-y-6">
          <Carte titre="Fiche">
            {peutEcrire ? (
              <form action={enregistrerMateriel.bind(null, id)} className="space-y-3">
                <div>
                  <label className="etiquette" htmlFor="type">Type</label>
                  <select id="type" name="type" className="champ" defaultValue={m.type}>
                    {TYPES.map((t) => <option key={t} value={t}>{libelleTypeMateriel[t]}</option>)}
                  </select>
                </div>
                <div><label className="etiquette" htmlFor="nom">Désignation</label><input id="nom" name="nom" defaultValue={m.nom} className="champ" required /></div>
                <div><label className="etiquette" htmlFor="immatriculation">Immatriculation</label><input id="immatriculation" name="immatriculation" defaultValue={m.immatriculation} className="champ" /></div>
                <div><label className="etiquette" htmlFor="numeroSerie">N° de série</label><input id="numeroSerie" name="numeroSerie" defaultValue={m.numeroSerie} className="champ" /></div>
                <div><label className="etiquette" htmlFor="dateAchat">Acheté le</label><input id="dateAchat" name="dateAchat" type="date" defaultValue={m.dateAchat} className="champ" /></div>
                <div>
                  <label className="etiquette" htmlFor="equipeId">Équipe</label>
                  <select id="equipeId" name="equipeId" className="champ" defaultValue={m.equipeId ?? ""}>
                    <option value="">Dépôt (partagé)</option>
                    {equipes.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                  </select>
                </div>
                <div><label className="etiquette" htmlFor="notes">Notes</label><textarea id="notes" name="notes" rows={2} defaultValue={m.notes} className="champ" /></div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="actif" defaultChecked={m.actif} /> En service</label>
                <button type="submit" className="bouton-secondaire w-full">Enregistrer</button>
              </form>
            ) : (
              <Definition items={[{ libelle: "Équipe", valeur: equipes.find((e) => e.id === m.equipeId)?.nom ?? "Dépôt" }, { libelle: "Acheté le", valeur: fmtDate(m.dateAchat) }]} />
            )}
          </Carte>
        </div>
      </div>
    </>
  );
}
