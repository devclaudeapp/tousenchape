import Link from "next/link";
import { getStore } from "@/lib/auth/session";
import { estBureau, exiger } from "@/lib/auth/roles";
import { libelleTypeMateriel, prochaineEcheance } from "@/lib/domain/materiel";
import { fmtDate } from "@/lib/format";
import type { TypeMateriel } from "@/lib/domain/types";
import { Badge, Carte, EnTete, Stat } from "@/components/ui";
import { enregistrerMateriel } from "./actions";

export const metadata = { title: "Matériel" };

const TYPES: TypeMateriel[] = ["pompe", "malaxeur", "camion", "laser", "bombe_cm", "autre"];

export default async function MaterielPage() {
  const { session, store } = await getStore();
  exiger(session, "materiel");
  const [materiels, equipes, chantiers] = await Promise.all([store.materiels(), store.equipes(), store.chantiers()]);
  const aujourdHui = new Date();
  const jour = aujourdHui.toISOString().slice(0, 10);
  const actifs = materiels.filter((m) => m.actif);
  const echeances = actifs.map((m) => ({ m, e: prochaineEcheance(m, aujourdHui) }));
  const expires = echeances.filter((x) => x.e.etat === "expiree").length;
  const bientot = echeances.filter((x) => x.e.etat === "expire_bientot").length;
  const peutEcrire = estBureau(session) || session.membre.role === "chef_equipe";
  const affecteAujourdHui = (id: string) => chantiers.find((c) => c.dateCoulage === jour && c.materielIds?.includes(id));

  return (
    <>
      <EnTete titre="Matériel" sousTitre={`${actifs.length} équipement${actifs.length > 1 ? "s" : ""} en service`} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat libelle="Contrôles en retard" valeur={expires} detail="VGP, contrôle technique, étalonnage dépassés" accent={expires === 0} />
        <Stat libelle="À faire sous 30 jours" valeur={bientot} />
        <Stat libelle="Sans aucun contrôle enregistré" valeur={actifs.filter((m) => m.controles.length === 0).length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {TYPES.filter((t) => materiels.some((m) => m.type === t)).map((t) => (
            <Carte key={t} titre={libelleTypeMateriel[t]}>
              <table className="tableau">
                <thead>
                  <tr>
                    <th>Matériel</th>
                    <th>Équipe</th>
                    <th>Prochaine échéance</th>
                    <th>Aujourd&apos;hui</th>
                  </tr>
                </thead>
                <tbody>
                  {materiels.filter((m) => m.type === t).map((m) => {
                    const e = prochaineEcheance(m, aujourdHui);
                    const ch = affecteAujourdHui(m.id);
                    return (
                      <tr key={m.id} className={m.actif ? "" : "opacity-50"}>
                        <td>
                          <Link href={`/app/materiel/${m.id}`} className="font-medium text-stone-900 hover:text-brand-700">{m.nom}</Link>
                          <div className="text-xs text-stone-500">{m.immatriculation ?? m.numeroSerie ?? ""}{!m.actif ? " · hors service" : ""}</div>
                        </td>
                        <td>{equipes.find((x) => x.id === m.equipeId)?.nom ?? "—"}</td>
                        <td>
                          {e.etat === "sans_echeance" ? (
                            <Badge classe="bg-stone-100 text-stone-600">Aucun contrôle</Badge>
                          ) : (
                            <span className="flex flex-wrap items-center gap-1.5">
                              <Badge classe={e.etat === "expiree" ? "bg-rose-100 text-rose-800" : e.etat === "expire_bientot" ? "bg-amber-100 text-amber-800" : "bg-brand-100 text-brand-800"}>
                                {e.etat === "expiree" ? `En retard de ${Math.abs(e.joursRestants ?? 0)} j` : e.etat === "expire_bientot" ? `Dans ${e.joursRestants} j` : fmtDate(e.date)}
                              </Badge>
                              <span className="text-xs text-stone-500">{e.libelle}</span>
                            </span>
                          )}
                        </td>
                        <td className="text-xs text-stone-600">{ch ? <Link href={`/app/chantiers/${ch.id}`} className="hover:text-brand-700">{ch.numero} · {ch.ville}</Link> : "Au dépôt"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Carte>
          ))}
        </div>

        {peutEcrire && (
          <Carte titre="Ajouter un matériel">
            <form action={enregistrerMateriel.bind(null, null)} className="space-y-3">
              <div>
                <label className="etiquette" htmlFor="type">Type</label>
                <select id="type" name="type" className="champ" defaultValue="pompe">
                  {TYPES.map((t) => <option key={t} value={t}>{libelleTypeMateriel[t]}</option>)}
                </select>
              </div>
              <div><label className="etiquette" htmlFor="nom">Désignation</label><input id="nom" name="nom" required className="champ" placeholder="Pompe à chape Lancy TF400" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="etiquette" htmlFor="immatriculation">Immatriculation</label><input id="immatriculation" name="immatriculation" className="champ" /></div>
                <div><label className="etiquette" htmlFor="numeroSerie">N° de série</label><input id="numeroSerie" name="numeroSerie" className="champ" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="etiquette" htmlFor="dateAchat">Acheté le</label><input id="dateAchat" name="dateAchat" type="date" className="champ" /></div>
                <div>
                  <label className="etiquette" htmlFor="equipeId">Équipe</label>
                  <select id="equipeId" name="equipeId" className="champ" defaultValue="">
                    <option value="">Dépôt (partagé)</option>
                    {equipes.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="bouton-primaire w-full">Créer la fiche</button>
            </form>
          </Carte>
        )}
      </div>
    </>
  );
}
