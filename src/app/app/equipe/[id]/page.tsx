import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { getStore } from "@/lib/auth/session";
import { estBureau, exiger } from "@/lib/auth/roles";
import { CATALOGUE_HABILITATIONS, MOTIFS_INDISPONIBILITE, etatValidite, libelleContrat, libelleMotif, type TypeHabilitation } from "@/lib/domain/habilitations";
import { fmtDate } from "@/lib/format";
import { Badge, Carte, Definition, EnTete } from "@/components/ui";
import { FormulaireMembre } from "@/components/formulaire-membre";
import { ajouterHabilitation, ajouterIndisponibilite, mettreAJourMembre, supprimerHabilitation, supprimerIndisponibilite } from "../actions";

const libelleRole = { gerant: "Gérant", bureau: "Bureau", chef_equipe: "Chef d'équipe", applicateur: "Applicateur" } as const;

export default async function FicheMembre({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ modifier?: string; erreur?: string }> }) {
  const { id } = await params;
  const { modifier, erreur } = await searchParams;
  const { session, store } = await getStore();
  exiger(session, "equipe");
  const membre = await store.membre(id);
  if (!membre) notFound();
  const bureau = estBureau(session);
  const peutVoir = bureau || session.membre.id === id || (session.membre.role === "chef_equipe" && membre.equipeId === session.membre.equipeId);
  if (!peutVoir) redirect("/app/equipe");
  const [equipes, indisponibilites, chantiers] = await Promise.all([store.equipes(), store.indisponibilites(), store.chantiers()]);
  const equipe = equipes.find((e) => e.id === membre.equipeId);
  const aujourdHui = new Date();
  const jour = aujourdHui.toISOString().slice(0, 10);
  const mesIndispos = indisponibilites.filter((i) => i.membreId === id);
  const mesChantiers = chantiers.filter((c) => c.chefEquipeId === id || (c.equipeId && c.equipeId === membre.equipeId)).filter((c) => c.dateCoulage && c.dateCoulage >= jour).slice(0, 5);
  const peutSaisirAbsence = bureau || session.membre.role === "chef_equipe" || session.membre.id === id;

  if (modifier && bureau) {
    return (
      <div className="mx-auto max-w-3xl">
        <EnTete titre={`Modifier ${membre.nom}`} />
        <FormulaireMembre action={mettreAJourMembre.bind(null, id)} membre={membre} equipes={equipes} />
      </div>
    );
  }

  return (
    <>
      <EnTete
        titre={
          <span className="flex items-center gap-3">
            {membre.nom}
            {!membre.actif && <Badge classe="bg-stone-200 text-stone-600">Inactif</Badge>}
            {membre.cqpNumero && <Badge classe="bg-brand-100 text-brand-800">CQP chapiste</Badge>}
          </span>
        }
        sousTitre={`${libelleRole[membre.role]}${equipe ? ` · ${equipe.nom}` : ""}${membre.typeContrat ? ` · ${libelleContrat[membre.typeContrat]}` : ""}`}
        actions={
          bureau && (
            <Link href={`/app/equipe/${id}?modifier=1`} className="bouton-secondaire">
              Modifier la fiche
            </Link>
          )
        }
      />
      {erreur && <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{erreur}</p>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Carte titre="Habilitations et documents" classe="scroll-mt-6">
            <div id="habilitations" />
            {membre.habilitations.length === 0 ? (
              <p className="text-sm text-stone-500">Aucune habilitation enregistrée. La carte BTP est obligatoire pour tout salarié sur chantier.</p>
            ) : (
              <table className="tableau">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Numéro</th>
                    <th>Obtenu le</th>
                    <th>Valable jusqu&apos;au</th>
                    <th>État</th>
                    {bureau && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {membre.habilitations.map((h) => {
                    const { etat, joursRestants } = etatValidite(h.dateFin, aujourdHui);
                    const badge =
                      etat === "expiree" ? <Badge classe="bg-rose-100 text-rose-800">Expirée depuis {Math.abs(joursRestants ?? 0)} j</Badge>
                      : etat === "expire_bientot" ? <Badge classe="bg-amber-100 text-amber-800">À renouveler dans {joursRestants} j</Badge>
                      : etat === "valide" ? <Badge classe="bg-brand-100 text-brand-800">Valide</Badge>
                      : <Badge>Sans échéance</Badge>;
                    return (
                      <tr key={h.id}>
                        <td>
                          {h.libelle ?? CATALOGUE_HABILITATIONS[h.type].libelle}
                          {h.organisme && <div className="text-xs text-stone-500">{h.organisme}</div>}
                        </td>
                        <td className="text-stone-600">{h.numero ?? "—"}</td>
                        <td className="text-stone-600">{fmtDate(h.dateObtention)}</td>
                        <td className="text-stone-600">{fmtDate(h.dateFin)}</td>
                        <td>{badge}</td>
                        {bureau && (
                          <td>
                            <form action={supprimerHabilitation.bind(null, id, h.id)}>
                              <button type="submit" className="bouton-discret p-1.5" aria-label="Supprimer">
                                <Trash2 className="h-4 w-4" aria-hidden />
                              </button>
                            </form>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {bureau && (
              <form action={ajouterHabilitation.bind(null, id)} className="mt-4 grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-3 sm:grid-cols-3">
                <h3 className="text-sm font-semibold text-stone-800 sm:col-span-3">Ajouter un document</h3>
                <div>
                  <label htmlFor="type" className="etiquette">Type</label>
                  <select id="type" name="type" className="champ" defaultValue="carte_btp">
                    {(Object.keys(CATALOGUE_HABILITATIONS) as TypeHabilitation[]).map((t) => (
                      <option key={t} value={t}>{CATALOGUE_HABILITATIONS[t].libelle}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="libelle" className="etiquette">Libellé (si « Autre »)</label>
                  <input id="libelle" name="libelle" className="champ" />
                </div>
                <div>
                  <label htmlFor="numero" className="etiquette">Numéro</label>
                  <input id="numero" name="numero" className="champ" />
                </div>
                <div>
                  <label htmlFor="organisme" className="etiquette">Organisme</label>
                  <input id="organisme" name="organisme" className="champ" />
                </div>
                <div>
                  <label htmlFor="dateObtention" className="etiquette">Obtenu le</label>
                  <input id="dateObtention" name="dateObtention" type="date" className="champ" />
                </div>
                <div>
                  <label htmlFor="dateFin" className="etiquette">Valable jusqu&apos;au (sinon calculé)</label>
                  <input id="dateFin" name="dateFin" type="date" className="champ" />
                </div>
                <div className="sm:col-span-3">
                  <button type="submit" className="bouton-primaire">Ajouter</button>
                </div>
              </form>
            )}
          </Carte>

          <Carte titre="Absences et indisponibilités" classe="scroll-mt-6">
            <div id="indisponibilites" />
            {mesIndispos.length === 0 ? (
              <p className="text-sm text-stone-500">Aucune absence enregistrée.</p>
            ) : (
              <ul className="divide-y divide-stone-100 text-sm">
                {mesIndispos.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                    <span className={i.fin < jour ? "text-stone-400" : ""}>
                      {i.debut === i.fin ? `Le ${fmtDate(i.debut)}` : `Du ${fmtDate(i.debut)} au ${fmtDate(i.fin)}`} · {libelleMotif[i.motif]}
                      {i.commentaire && <span className="text-stone-500"> — {i.commentaire}</span>}
                    </span>
                    {(bureau || session.membre.role === "chef_equipe") && i.fin >= jour && (
                      <form action={supprimerIndisponibilite.bind(null, id, i.id)}>
                        <button type="submit" className="bouton-discret p-1.5" aria-label="Supprimer">
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {peutSaisirAbsence && (
              <form action={ajouterIndisponibilite.bind(null, id)} className="mt-4 grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-3 sm:grid-cols-4">
                <div>
                  <label htmlFor="debut" className="etiquette">Du</label>
                  <input id="debut" name="debut" type="date" required className="champ" />
                </div>
                <div>
                  <label htmlFor="fin" className="etiquette">Au (inclus)</label>
                  <input id="fin" name="fin" type="date" className="champ" />
                </div>
                <div>
                  <label htmlFor="motif" className="etiquette">Motif</label>
                  <select id="motif" name="motif" className="champ" defaultValue="conge">
                    {MOTIFS_INDISPONIBILITE.map((m) => (
                      <option key={m} value={m}>{libelleMotif[m]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="commentaire" className="etiquette">Commentaire</label>
                  <input id="commentaire" name="commentaire" className="champ" />
                </div>
                <div className="sm:col-span-4">
                  <button type="submit" className="bouton-secondaire">Enregistrer l&apos;absence</button>
                </div>
              </form>
            )}
          </Carte>
        </div>

        <div className="space-y-6">
          <Carte titre="Fiche">
            <Definition
              items={[
                { libelle: "Téléphone", valeur: membre.telephone ? <a href={`tel:${membre.telephone}`} className="hover:text-brand-700">{membre.telephone}</a> : "—" },
                { libelle: "E-mail", valeur: membre.email || "—" },
                { libelle: "Équipe", valeur: equipe?.nom ?? "—" },
                { libelle: "Contrat", valeur: membre.typeContrat ? libelleContrat[membre.typeContrat] : "—" },
                { libelle: "Entré le", valeur: fmtDate(membre.dateEntree) },
                { libelle: "CQP chapiste", valeur: membre.cqpNumero ? `${membre.cqpNumero} (${fmtDate(membre.cqpDate)})` : "Non titulaire" },
              ]}
            />
            {membre.notes && <p className="mt-4 whitespace-pre-line text-sm text-stone-600">{membre.notes}</p>}
          </Carte>
          <Carte titre="Prochains chantiers">
            {mesChantiers.length === 0 ? (
              <p className="text-sm text-stone-500">Aucun coulage planifié.</p>
            ) : (
              <ul className="divide-y divide-stone-100 text-sm">
                {mesChantiers.map((c) => (
                  <li key={c.id} className="py-2">
                    <Link href={`/app/chantiers/${c.id}`} className="font-medium hover:text-brand-700">{c.numero}</Link>
                    <span className="text-stone-500"> · {fmtDate(c.dateCoulage)} · {c.ville}</span>
                  </li>
                ))}
              </ul>
            )}
          </Carte>
        </div>
      </div>
    </>
  );
}
