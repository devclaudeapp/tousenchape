"use client";

import { useActionState } from "react";
import type { Client } from "@/lib/domain/types";
import type { EtatFormulaireClient } from "@/app/app/clients/actions";

export function FormulaireClient({
  action,
  client,
  suite,
}: {
  action: (etat: EtatFormulaireClient, formData: FormData) => Promise<EtatFormulaireClient>;
  client?: Client;
  suite?: string;
}) {
  const [etat, soumettre, enCours] = useActionState(action, undefined);

  return (
    <form action={soumettre} className="carte space-y-5 p-6">
      {suite && <input type="hidden" name="suite" value={suite} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="type" className="etiquette">Type</label>
          <select id="type" name="type" defaultValue={client?.type ?? "particulier"} className="champ">
            <option value="particulier">Particulier</option>
            <option value="professionnel">Professionnel (entreprise générale, constructeur, promoteur…)</option>
            <option value="collectivite">Collectivité</option>
          </select>
        </div>
        <div>
          <label htmlFor="nom" className="etiquette">Nom ou raison sociale</label>
          <input id="nom" name="nom" required defaultValue={client?.nom} className="champ" />
        </div>
        <div>
          <label htmlFor="siren" className="etiquette">SIREN (requis pour un professionnel)</label>
          <input id="siren" name="siren" inputMode="numeric" defaultValue={client?.siren} className="champ" placeholder="123 456 789" />
        </div>
        <div>
          <label htmlFor="conditionsPaiementJours" className="etiquette">Délai de paiement (jours)</label>
          <input id="conditionsPaiementJours" name="conditionsPaiementJours" type="number" min={0} max={60} defaultValue={client?.conditionsPaiementJours ?? 30} className="champ" />
        </div>
        <div>
          <label htmlFor="email" className="etiquette">E-mail</label>
          <input id="email" name="email" type="email" defaultValue={client?.email} className="champ" />
        </div>
        <div>
          <label htmlFor="telephone" className="etiquette">Téléphone</label>
          <input id="telephone" name="telephone" type="tel" defaultValue={client?.telephone} className="champ" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="adresse" className="etiquette">Adresse de facturation</label>
          <input id="adresse" name="adresse" defaultValue={client?.adresse} className="champ" />
        </div>
        <div>
          <label htmlFor="codePostal" className="etiquette">Code postal</label>
          <input id="codePostal" name="codePostal" inputMode="numeric" defaultValue={client?.codePostal} className="champ" />
        </div>
        <div>
          <label htmlFor="ville" className="etiquette">Ville</label>
          <input id="ville" name="ville" defaultValue={client?.ville} className="champ" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="notes" className="etiquette">Notes</label>
          <textarea id="notes" name="notes" rows={3} defaultValue={client?.notes} className="champ" />
        </div>
      </div>
      {etat?.erreur && <p className="text-sm text-rose-700">{etat.erreur}</p>}
      <div className="flex justify-end gap-2">
        <button type="submit" disabled={enCours} className="bouton-primaire">
          {enCours ? "Enregistrement…" : client ? "Enregistrer" : "Créer le client"}
        </button>
      </div>
    </form>
  );
}
