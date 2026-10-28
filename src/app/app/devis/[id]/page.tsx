import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Pencil, Send, PenLine, Copy } from "lucide-react";
import { getStore } from "@/lib/auth/session";
import { chiffrerDevisEnregistre } from "@/lib/domain/chiffrage";
import { limitesEpaisseur } from "@/lib/chape/epaisseurs";
import { fmtDate, fmtEuros, fmtNombre, libelleLiant, libelleModePose, libelleRevetement, libelleStatutDevis } from "@/lib/format";
import { Badge, Carte, Definition, EnTete, ListeAlertes } from "@/components/ui";
import { EditeurDevis } from "@/components/editeur-devis";
import { changerStatutDevis, enregistrerDevis, nouvelleVersionDevis } from "../actions";

export default async function FicheDevis({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ modifier?: string; erreur?: string }> }) {
  const { id } = await params;
  const { modifier, erreur } = await searchParams;
  const { session, store } = await getStore();
  const devis = await store.devis(id);
  if (!devis) notFound();
  const [clients, produits, chantiers] = await Promise.all([store.clients(), store.produits(), store.chantiers()]);
  const client = clients.find((c) => c.id === devis.clientId);
  const produit = produits.find((p) => p.id === devis.produitId) ?? null;
  const chantier = chantiers.find((c) => c.devisId === id);
  const r = chiffrerDevisEnregistre(devis, session.entreprise, produit);
  const limites = limitesEpaisseur(devis.configuration);
  const bloquant = r.alertes.some((a) => a.severite === "bloquant");

  if (modifier && devis.statut === "brouillon") {
    return (
      <>
        <EnTete titre={`Modifier ${devis.numero}${devis.version > 1 ? ` v${devis.version}` : ""}`} />
        <EditeurDevis
          action={enregistrerDevis.bind(null, id)}
          clients={clients}
          produits={produits}
          entreprise={session.entreprise}
          initial={{
            clientId: devis.clientId,
            produitId: devis.produitId ?? "",
            objet: devis.objet,
            adresseChantier: devis.adresseChantier,
            codePostalChantier: devis.codePostalChantier,
            villeChantier: devis.villeChantier,
            configuration: devis.configuration,
            pieces: devis.pieces,
            options: devis.options,
            lignesLibres: devis.lignesLibres,
            contexteFiscal: devis.contexteFiscal,
            dateValidite: devis.dateValidite,
            notes: devis.notes,
          }}
        />
      </>
    );
  }

  const pc = devis.configuration.plancherChauffant;
  const plancher =
    pc.type === "aucun" ? "Aucun" : pc.type === "electrique" ? "Rayonnant électrique" : `Eau chaude type ${pc.type === "eau_A" ? "A" : "C"}, tube ${pc.diametreTubeMm} mm`;

  return (
    <>
      <EnTete
        titre={
          <span className="flex items-center gap-3">
            {devis.numero}
            {devis.version > 1 && <span className="text-stone-500">v{devis.version}</span>}
            <Badge classe={libelleStatutDevis[devis.statut].classe}>{libelleStatutDevis[devis.statut].label}</Badge>
          </span>
        }
        sousTitre={
          <>
            {client ? <Link href={`/app/clients/${client.id}`} className="hover:text-brand-700">{client.nom}</Link> : "Client inconnu"} · {devis.objet}
          </>
        }
        actions={
          <>
            <a href={`/app/devis/${id}/pdf`} className="bouton-secondaire" target="_blank" rel="noopener">
              <Download className="h-4 w-4" aria-hidden /> PDF
            </a>
            {devis.statut === "brouillon" && (
              <>
                <Link href={`/app/devis/${id}?modifier=1`} className="bouton-secondaire">
                  <Pencil className="h-4 w-4" aria-hidden /> Modifier
                </Link>
                <form action={changerStatutDevis.bind(null, id, "envoye")}>
                  <button type="submit" className="bouton-primaire" disabled={bloquant} title={bloquant ? "Corrigez les épaisseurs avant l'envoi" : undefined}>
                    <Send className="h-4 w-4" aria-hidden /> Marquer envoyé
                  </button>
                </form>
              </>
            )}
            {(devis.statut === "envoye" || devis.statut === "refuse" || devis.statut === "expire") && (
              <form action={nouvelleVersionDevis.bind(null, id)}>
                <button type="submit" className="bouton-secondaire">
                  <Copy className="h-4 w-4" aria-hidden /> Nouvelle version
                </button>
              </form>
            )}
          </>
        }
      />

      {erreur && <p className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{erreur}</p>}

      {devis.statut === "envoye" && (
        <div className="carte mb-6 flex flex-wrap items-end gap-3 border-brand-200 bg-brand-50 p-4">
          <form action={changerStatutDevis.bind(null, id, "signe")} className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="signatureNom" className="etiquette">Signé par</label>
              <input id="signatureNom" name="signatureNom" className="champ" placeholder="Nom du signataire" />
            </div>
            <button type="submit" className="bouton-primaire">
              <PenLine className="h-4 w-4" aria-hidden /> Enregistrer la signature et créer le chantier
            </button>
          </form>
          <form action={changerStatutDevis.bind(null, id, "refuse")}>
            <button type="submit" className="bouton-discret">Devis refusé</button>
          </form>
          <p className="basis-full text-xs text-brand-900">
            La signature électronique par lien client arrive en V1 ; en attendant, enregistrez ici la signature reçue (devis signé « bon pour accord »).
          </p>
        </div>
      )}

      {chantier && (
        <p className="mb-6 rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900">
          Ce devis a donné le chantier{" "}
          <Link href={`/app/chantiers/${chantier.id}`} className="font-medium underline">
            {chantier.numero}
          </Link>
          .
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Carte titre="Chiffrage">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Désignation</th>
                  <th className="text-right">Qté</th>
                  <th className="text-right">PU HT</th>
                  <th className="text-right">Montant HT</th>
                </tr>
              </thead>
              <tbody>
                {r.lignes.map((l, i) => (
                  <tr key={i}>
                    <td>
                      {l.designation}
                      <div className="text-xs text-stone-400">{l.lot === "chape" ? "" : `Lot ${l.lot}`}</div>
                    </td>
                    <td className="text-right tabular-nums">
                      {fmtNombre(l.quantite)} {l.unite}
                    </td>
                    <td className="text-right tabular-nums">{fmtEuros(l.prixUnitaireHT)}</td>
                    <td className="text-right tabular-nums">{fmtEuros(l.montantHT)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="text-right font-medium">Total HT</td>
                  <td className="text-right font-medium tabular-nums">{fmtEuros(r.totaux.totalHT)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-right text-stone-600">TVA {r.regime.autoliquidation ? "autoliquidée" : `${r.regime.taux} %`}</td>
                  <td className="text-right tabular-nums text-stone-600">{fmtEuros(r.totaux.tva)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="text-right text-base font-semibold">Total TTC</td>
                  <td className="text-right text-base font-semibold tabular-nums">{fmtEuros(r.totaux.totalTTC)}</td>
                </tr>
              </tfoot>
            </table>
          </Carte>

          <Carte titre="Pièces">
            <table className="tableau">
              <thead>
                <tr>
                  <th>Pièce</th>
                  <th className="text-right">Surface</th>
                  <th className="text-right">Périmètre</th>
                  <th className="text-right">Épaisseur</th>
                  <th className="text-right">Volume</th>
                </tr>
              </thead>
              <tbody>
                {devis.pieces.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nom}</td>
                    <td className="text-right tabular-nums">{fmtNombre(p.surfaceM2)} m²</td>
                    <td className="text-right tabular-nums">{fmtNombre(p.perimetreMl)} ml</td>
                    <td className={`text-right tabular-nums ${p.epaisseurCm < limites.minCm ? "font-medium text-rose-700" : ""}`}>{fmtNombre(p.epaisseurCm)} cm</td>
                    <td className="text-right tabular-nums">{fmtNombre(Math.round(p.surfaceM2 * p.epaisseurCm) / 100)} m³</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Carte>

          <Carte titre="Mentions portées sur le devis">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-stone-700">
              {r.regime.mentions.map((m) => (
                <li key={m}>{m}</li>
              ))}
              <li>
                Assurance décennale : {session.entreprise.assureurDecennale ?? "à renseigner"}, contrat {session.entreprise.numeroContratDecennale ?? "—"}, {session.entreprise.zoneCouvertureDecennale ?? "—"}.
              </li>
              <li>Devis valable jusqu&apos;au {fmtDate(devis.dateValidite)}. Devis gratuit.</li>
            </ul>
          </Carte>
        </div>

        <div className="space-y-6">
          <Carte titre="Contrôles">
            <ListeAlertes alertes={r.alertes} vide="Épaisseurs et fractionnement conformes." />
          </Carte>
          <Carte titre="Technique">
            <Definition
              items={[
                { libelle: "Produit", valeur: produit ? `${produit.fabricant} ${produit.nom} (${produit.classe})` : "—" },
                { libelle: "Liant", valeur: libelleLiant[devis.configuration.liant] },
                { libelle: "Mode de pose", valeur: `${libelleModePose[devis.configuration.modePose]}${devis.configuration.classeIsolant ? ` ${devis.configuration.classeIsolant}` : ""}` },
                { libelle: "Locaux", valeur: devis.configuration.classeLocal },
                { libelle: "Plancher chauffant", valeur: plancher },
                { libelle: "Revêtement", valeur: libelleRevetement[devis.configuration.revetement] },
                { libelle: "Épaisseur minimale", valeur: `${limites.minCm} cm (${limites.reference})` },
                { libelle: "Volume commandé", valeur: `${fmtNombre(r.quantites.volumeCommandeM3)} m³, ${r.quantites.nombreToupies} toupie${r.quantites.nombreToupies > 1 ? "s" : ""}` },
              ]}
            />
          </Carte>
          <Carte titre="Suivi">
            <Definition
              items={[
                { libelle: "Créé le", valeur: fmtDate(devis.createdAt) },
                { libelle: "Envoyé le", valeur: fmtDate(devis.envoyeLe) },
                { libelle: "Signé le", valeur: devis.signeLe ? `${fmtDate(devis.signeLe)}${devis.signatureNom ? ` par ${devis.signatureNom}` : ""}` : "—" },
                { libelle: "Validité", valeur: fmtDate(devis.dateValidite) },
              ]}
            />
            {devis.notes && <p className="mt-4 whitespace-pre-line text-sm text-stone-600">{devis.notes}</p>}
          </Carte>
        </div>
      </div>
    </>
  );
}
