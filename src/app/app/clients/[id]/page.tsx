import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { getStore } from "@/lib/auth/session";
import { exiger } from "@/lib/auth/roles";
import { chiffrerDevisEnregistre } from "@/lib/domain/chiffrage";
import { fmtDate, fmtEuros, libelleStatutChantier, libelleStatutDevis, libelleStatutFacture, libelleTypeClient, libelleTypeFacture } from "@/lib/format";
import { Badge, Carte, Definition, EnTete, Vide } from "@/components/ui";
import { FormulaireClient } from "@/components/formulaire-client";
import { mettreAJourClient } from "../actions";

export default async function FicheClient({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ modifier?: string }> }) {
  const { id } = await params;
  const { modifier } = await searchParams;
  const { session, store } = await getStore();
  exiger(session, "clients");
  const client = await store.client(id);
  if (!client) notFound();
  const [devis, chantiers, factures, produits] = await Promise.all([store.devisListe(), store.chantiers(), store.factures(), store.produits()]);
  const mesDevis = devis.filter((d) => d.clientId === id);
  const mesChantiers = chantiers.filter((c) => c.clientId === id);
  const mesFactures = factures.filter((f) => f.clientId === id);

  if (modifier) {
    return (
      <div className="mx-auto max-w-3xl">
        <EnTete titre={`Modifier ${client.nom}`} />
        <FormulaireClient action={mettreAJourClient.bind(null, id)} client={client} />
      </div>
    );
  }

  return (
    <>
      <EnTete
        titre={client.nom}
        sousTitre={
          <span className="flex items-center gap-2">
            <Badge>{libelleTypeClient[client.type]}</Badge>
            {client.siren && <span>SIREN {client.siren}</span>}
          </span>
        }
        actions={
          <>
            <Link href={`/app/clients/${id}?modifier=1`} className="bouton-secondaire">
              Modifier
            </Link>
            <Link href={`/app/devis/nouveau?client=${id}`} className="bouton-primaire">
              <Plus className="h-4 w-4" aria-hidden /> Nouveau devis
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Carte titre="Coordonnées">
          <Definition
            items={[
              { libelle: "Adresse", valeur: [client.adresse, [client.codePostal, client.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "—" },
              { libelle: "E-mail", valeur: client.email ?? "—" },
              { libelle: "Téléphone", valeur: client.telephone ?? "—" },
              { libelle: "Délai de paiement", valeur: `${client.conditionsPaiementJours} jours` },
            ]}
          />
          {client.notes && <p className="mt-4 whitespace-pre-line text-sm text-stone-600">{client.notes}</p>}
        </Carte>

        <div className="space-y-6 lg:col-span-2">
          <Carte titre="Devis">
            {mesDevis.length === 0 ? (
              <Vide titre="Aucun devis" />
            ) : (
              <ul className="divide-y divide-stone-100">
                {mesDevis.map((d) => {
                  const r = chiffrerDevisEnregistre(d, session.entreprise, produits.find((p) => p.id === d.produitId));
                  return (
                    <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <Link href={`/app/devis/${d.id}`} className="font-medium text-stone-900 hover:text-brand-700">
                          {d.numero}
                          {d.version > 1 && ` v${d.version}`}
                        </Link>
                        <div className="truncate text-xs text-stone-500">{d.objet}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm tabular-nums">{fmtEuros(r.totaux.totalHT)} HT</span>
                        <Badge classe={libelleStatutDevis[d.statut].classe}>{libelleStatutDevis[d.statut].label}</Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Carte>

          <Carte titre="Chantiers">
            {mesChantiers.length === 0 ? (
              <Vide titre="Aucun chantier" />
            ) : (
              <ul className="divide-y divide-stone-100">
                {mesChantiers.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <Link href={`/app/chantiers/${c.id}`} className="font-medium text-stone-900 hover:text-brand-700">
                        {c.numero} · {c.adresse}, {c.ville}
                      </Link>
                      <div className="text-xs text-stone-500">Coulage le {fmtDate(c.dateCoulage)}</div>
                    </div>
                    <Badge classe={libelleStatutChantier[c.statut].classe}>{libelleStatutChantier[c.statut].label}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Carte>

          <Carte titre="Factures">
            {mesFactures.length === 0 ? (
              <Vide titre="Aucune facture" />
            ) : (
              <ul className="divide-y divide-stone-100">
                {mesFactures.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <span className="font-medium text-stone-900">{f.numero}</span>
                      <span className="ml-2 text-xs text-stone-500">
                        {libelleTypeFacture[f.type]} · émise le {fmtDate(f.dateEmission)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm tabular-nums">{fmtEuros(f.totalTTC)}</span>
                      <Badge classe={libelleStatutFacture[f.statut].classe}>{libelleStatutFacture[f.statut].label}</Badge>
                    </div>
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
