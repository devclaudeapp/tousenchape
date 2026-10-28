import { ExternalLink, Mail, Trash2 } from "lucide-react";
import { getStore } from "@/lib/auth/session";
import { exiger } from "@/lib/auth/roles";
import { etatValidite } from "@/lib/domain/habilitations";
import { fmtDate } from "@/lib/format";
import type { TypeDocumentEntreprise } from "@/lib/domain/types";
import { Badge, Carte, EnTete } from "@/components/ui";
import { creerDocument, supprimerDocument } from "./actions";

export const metadata = { title: "Documents" };

export const libelleDocument: Record<TypeDocumentEntreprise, { libelle: string; periodicite: string }> = {
  kbis: { libelle: "Extrait Kbis", periodicite: "moins de 3 mois pour un donneur d'ordre" },
  urssaf: { libelle: "Attestation de vigilance URSSAF", periodicite: "6 mois ; obligatoire dès 5 000 € de contrat" },
  decennale: { libelle: "Attestation d'assurance décennale", periodicite: "1 an ; jointe aux devis et factures" },
  rc_pro: { libelle: "Attestation RC professionnelle", periodicite: "1 an" },
  liste_salaries: { libelle: "Liste nominative des salariés étrangers soumis à autorisation", periodicite: "6 mois, avec l'attestation URSSAF" },
  rib: { libelle: "RIB", periodicite: "sans échéance" },
  autre: { libelle: "Autre", periodicite: "" },
};

export default async function Documents() {
  const { session, store } = await getStore();
  exiger(session, "documents");
  const [documents, clients] = await Promise.all([store.documents(), store.clients()]);
  const aujourdHui = new Date();
  const avecEtat = documents.map((d) => ({ d, e: etatValidite(d.dateFin, aujourdHui, 30) }));
  const valides = avecEtat.filter((x) => x.e.etat !== "expiree");
  const perimes = avecEtat.filter((x) => x.e.etat === "expiree");
  const donneursOrdre = clients.filter((c) => c.type !== "particulier" && c.email);

  const corpsPack = `Bonjour,

Veuillez trouver ci-joint les documents de vigilance de ${session.entreprise.nom} (SIREN ${session.entreprise.siren}) :
${valides.map((x) => `- ${x.d.nom}${x.d.dateFin ? ` (valable jusqu'au ${fmtDate(x.d.dateFin)})` : ""}`).join("\n")}

Conformément à la loi du 31 décembre 1975 et aux articles L8222-1 et D8222-5 du Code du travail, nous vous les transmettrons à nouveau tous les six mois.

Cordialement,
${session.entreprise.nom}${session.entreprise.telephone ? ` · ${session.entreprise.telephone}` : ""}`;

  return (
    <>
      <EnTete titre="Coffre-fort des documents" sousTitre="Pièces de conformité à fournir aux donneurs d'ordre, avec leurs échéances." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Carte titre={`${documents.length} document${documents.length > 1 ? "s" : ""}`}>
            <table className="tableau">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Valable jusqu&apos;au</th>
                  <th>État</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {avecEtat.map(({ d, e }) => (
                  <tr key={d.id}>
                    <td>
                      <div className="font-medium">{d.nom}</div>
                      <div className="text-xs text-stone-500">{libelleDocument[d.type].libelle}{libelleDocument[d.type].periodicite ? ` · ${libelleDocument[d.type].periodicite}` : ""}</div>
                    </td>
                    <td>{fmtDate(d.dateFin)}</td>
                    <td>
                      {e.etat === "expiree" ? <Badge classe="bg-rose-100 text-rose-800">Périmé depuis {Math.abs(e.joursRestants ?? 0)} j</Badge> : e.etat === "expire_bientot" ? <Badge classe="bg-amber-100 text-amber-800">Expire dans {e.joursRestants} j</Badge> : e.etat === "valide" ? <Badge classe="bg-brand-100 text-brand-800">Valide</Badge> : <Badge>Sans échéance</Badge>}
                    </td>
                    <td>
                      <span className="flex items-center gap-1">
                        {d.url && <a href={d.url} target="_blank" rel="noopener" className="bouton-discret p-1.5" aria-label="Ouvrir"><ExternalLink className="h-4 w-4" aria-hidden /></a>}
                        <form action={supprimerDocument.bind(null, d.id)}>
                          <button type="submit" className="bouton-discret p-1.5" aria-label="Supprimer"><Trash2 className="h-4 w-4" aria-hidden /></button>
                        </form>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Carte>

          <Carte titre="Pack donneur d'ordre (tous les 6 mois)">
            <p className="text-sm text-stone-600">
              {valides.length} document{valides.length > 1 ? "s" : ""} valide{valides.length > 1 ? "s" : ""} à joindre
              {perimes.length > 0 && <span className="text-rose-700">, {perimes.length} périmé{perimes.length > 1 ? "s" : ""} à renouveler d&apos;abord</span>}.
              Le message est préparé ; les fichiers se joignent depuis votre messagerie (l&apos;envoi automatique avec pièces jointes arrive avec la connexion e-mail).
            </p>
            <ul className="mt-3 divide-y divide-stone-100 text-sm">
              {donneursOrdre.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                  <span>{c.nom} <span className="text-stone-500">· {c.email}</span></span>
                  <a href={`mailto:${c.email}?subject=${encodeURIComponent(`Documents de vigilance — ${session.entreprise.nom}`)}&body=${encodeURIComponent(corpsPack)}`} className="bouton-secondaire py-1"><Mail className="h-4 w-4" aria-hidden /> Préparer l&apos;envoi</a>
                </li>
              ))}
              {donneursOrdre.length === 0 && <li className="py-2 text-stone-500">Aucun client professionnel avec e-mail.</li>}
            </ul>
          </Carte>
        </div>

        <Carte titre="Ajouter un document">
          <form action={creerDocument} className="space-y-3">
            <div>
              <label className="etiquette" htmlFor="type">Type</label>
              <select id="type" name="type" className="champ" defaultValue="urssaf">
                {(Object.keys(libelleDocument) as TypeDocumentEntreprise[]).map((t) => <option key={t} value={t}>{libelleDocument[t].libelle}</option>)}
              </select>
            </div>
            <div><label className="etiquette" htmlFor="nom">Nom</label><input id="nom" name="nom" required className="champ" /></div>
            <div><label className="etiquette" htmlFor="dateFin">Valable jusqu&apos;au</label><input id="dateFin" name="dateFin" type="date" className="champ" /></div>
            <div><label className="etiquette" htmlFor="url">Lien vers le fichier (Drive, espace URSSAF…)</label><input id="url" name="url" type="url" className="champ" placeholder="https://" /></div>
            <button type="submit" className="bouton-primaire w-full">Enregistrer</button>
          </form>
        </Carte>
      </div>
    </>
  );
}
