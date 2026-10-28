"use client";

import { useActionState } from "react";
import type { Equipe, Membre } from "@/lib/domain/types";
import { TYPES_CONTRAT, libelleContrat } from "@/lib/domain/habilitations";
import type { EtatEquipe } from "@/app/app/equipe/actions";

export function FormulaireMembre({
  action,
  membre,
  equipes,
}: {
  action: (etat: EtatEquipe, formData: FormData) => Promise<EtatEquipe>;
  membre?: Membre;
  equipes: Equipe[];
}) {
  const [etat, soumettre, enCours] = useActionState(action, undefined);
  return (
    <form action={soumettre} className="carte space-y-5 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nom" className="etiquette">Nom et prénom</label>
          <input id="nom" name="nom" required defaultValue={membre?.nom} className="champ" />
        </div>
        <div>
          <label htmlFor="role" className="etiquette">Rôle</label>
          <select id="role" name="role" defaultValue={membre?.role ?? "applicateur"} className="champ">
            <option value="applicateur">Applicateur</option>
            <option value="chef_equipe">Chef d&apos;équipe</option>
            <option value="bureau">Bureau / secrétariat</option>
            <option value="gerant">Gérant</option>
          </select>
        </div>
        <div>
          <label htmlFor="email" className="etiquette">E-mail (connexion)</label>
          <input id="email" name="email" type="email" defaultValue={membre?.email} className="champ" />
        </div>
        <div>
          <label htmlFor="telephone" className="etiquette">Téléphone</label>
          <input id="telephone" name="telephone" type="tel" defaultValue={membre?.telephone} className="champ" />
        </div>
        <div>
          <label htmlFor="equipeId" className="etiquette">Équipe</label>
          <select id="equipeId" name="equipeId" defaultValue={membre?.equipeId ?? ""} className="champ">
            <option value="">Aucune (bureau, remplaçant)</option>
            {equipes.map((e) => (
              <option key={e.id} value={e.id}>{e.nom}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="typeContrat" className="etiquette">Contrat</label>
          <select id="typeContrat" name="typeContrat" defaultValue={membre?.typeContrat ?? "cdi"} className="champ">
            {TYPES_CONTRAT.map((t) => (
              <option key={t} value={t}>{libelleContrat[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="dateEntree" className="etiquette">Date d&apos;entrée</label>
          <input id="dateEntree" name="dateEntree" type="date" defaultValue={membre?.dateEntree} className="champ" />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="actif" defaultChecked={membre?.actif ?? true} /> Actif (présent dans le planning)
        </label>
        <div className="sm:col-span-2 rounded-md border border-brand-200 bg-brand-50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-900">CQP chef d&apos;équipe chapiste</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="cqpNumero" className="etiquette">Numéro</label>
              <input id="cqpNumero" name="cqpNumero" defaultValue={membre?.cqpNumero} className="champ" placeholder="Laisser vide si non titulaire" />
            </div>
            <div>
              <label htmlFor="cqpDate" className="etiquette">Date d&apos;obtention</label>
              <input id="cqpDate" name="cqpDate" type="date" defaultValue={membre?.cqpDate} className="champ" />
            </div>
          </div>
          <p className="mt-2 text-xs text-brand-900">Depuis le 1er août 2024, chaque chantier doit compter un titulaire. Le CQP n&apos;expire pas.</p>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="notes" className="etiquette">Notes</label>
          <textarea id="notes" name="notes" rows={2} defaultValue={membre?.notes} className="champ" />
        </div>
      </div>
      {etat?.erreur && <p className="text-sm text-rose-700">{etat.erreur}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={enCours} className="bouton-primaire">
          {enCours ? "Enregistrement…" : membre ? "Enregistrer" : "Créer la fiche"}
        </button>
      </div>
    </form>
  );
}
