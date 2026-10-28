import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowRight, Info, OctagonX, Plus } from "lucide-react";
import { getStore } from "@/lib/auth/session";
import { estTerrain } from "@/lib/auth/roles";
import { calculerAlertes } from "@/lib/domain/alertes";
import { chiffrerDevisEnregistre } from "@/lib/domain/chiffrage";
import { fmtDate, fmtEuros, fmtNombre, libelleStatutChantier, libelleStatutDevis } from "@/lib/format";
import { Badge, Carte, EnTete, Stat, Vide } from "@/components/ui";

export const metadata = { title: "Tableau de bord" };

export default async function TableauDeBord({ searchParams }: { searchParams: Promise<{ refus?: string }> }) {
  const { refus } = await searchParams;
  const { session, store } = await getStore();
  if (estTerrain(session) && !refus) redirect("/app/ma-journee");
  const [devis, chantiers, clients, factures, produits, membres, equipes, indisponibilites, messages] = await Promise.all([
    store.devisListe(),
    store.chantiers(),
    store.clients(),
    store.factures(),
    store.produits(),
    store.membres(),
    store.equipes(),
    store.indisponibilites(),
    store.messages(),
  ]);
  const alertes = calculerAlertes({ aujourdHui: new Date(), entreprise: session.entreprise, membres, equipes, chantiers, factures, indisponibilites, messages });
  const iconeAlerte = { urgent: OctagonX, attention: AlertTriangle, info: Info } as const;
  const classeAlerte = { urgent: "text-rose-600", attention: "text-amber-600", info: "text-sky-600" } as const;
  const produit = (id?: string) => produits.find((p) => p.id === id) ?? null;
  const client = (id: string) => clients.find((c) => c.id === id)?.nom ?? "Client inconnu";

  const devisEnCours = devis.filter((d) => d.statut === "envoye");
  const carnet = devis.filter((d) => d.statut === "signe");
  const totalDevis = (liste: typeof devis) => liste.reduce((s, d) => s + chiffrerDevisEnregistre(d, session.entreprise, produit(d.produitId)).totaux.totalHT, 0);
  const surfaceCarnet = carnet.reduce((s, d) => s + d.pieces.reduce((t, p) => t + p.surfaceM2, 0), 0);

  const aujourdHui = new Date().toISOString().slice(0, 10);
  const aVenir = chantiers.filter((c) => c.dateCoulage && c.dateCoulage >= aujourdHui && !["facture", "clos"].includes(c.statut)).slice(0, 5);
  const enRetard = factures.filter((f) => f.statut === "en_retard");
  const encours = factures.filter((f) => f.statut === "emise" || f.statut === "en_retard").reduce((s, f) => s + f.totalTTC - f.paiements.reduce((p, x) => p + x.montant, 0), 0);

  return (
    <>
      <EnTete
        titre={`Bonjour ${session.membre.nom.split(" ")[0]}`}
        sousTitre={session.entreprise.nom}
        actions={
          <Link href="/app/devis/nouveau" className="bouton-primaire">
            <Plus className="h-4 w-4" aria-hidden /> Nouveau devis
          </Link>
        }
      />

      {refus && <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Ce module n&apos;est pas accessible avec votre rôle.</p>}

      {alertes.length > 0 && (
        <Carte titre={`À traiter · ${alertes.filter((a) => a.niveau === "urgent").length} urgent${alertes.filter((a) => a.niveau === "urgent").length > 1 ? "s" : ""}, ${alertes.filter((a) => a.niveau !== "urgent").length} à surveiller`} classe="mb-6">
          <ul className="divide-y divide-stone-100">
            {alertes.slice(0, 8).map((a) => {
              const Icone = iconeAlerte[a.niveau];
              return (
                <li key={a.code} className="flex items-start gap-3 py-2">
                  <Icone className={`mt-0.5 h-4 w-4 shrink-0 ${classeAlerte[a.niveau]}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    {a.lien ? (
                      <Link href={a.lien} className="text-sm font-medium text-stone-900 hover:text-brand-700">{a.titre}</Link>
                    ) : (
                      <span className="text-sm font-medium text-stone-900">{a.titre}</span>
                    )}
                    {a.detail && <p className="text-xs text-stone-500">{a.detail}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
          {alertes.length > 8 && <p className="mt-2 text-xs text-stone-500">{alertes.length - 8} autres alertes.</p>}
        </Carte>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat libelle="Devis en attente" valeur={fmtEuros(totalDevis(devisEnCours))} detail={`${devisEnCours.length} devis envoyé${devisEnCours.length > 1 ? "s" : ""}`} />
        <Stat libelle="Carnet de commandes" valeur={fmtEuros(totalDevis(carnet))} detail={`${fmtNombre(surfaceCarnet)} m² signés, à couler`} accent />
        <Stat libelle="Coulages à venir" valeur={aVenir.length} detail={aVenir[0] ? `Prochain le ${fmtDate(aVenir[0].dateCoulage)}` : "Aucun coulage planifié"} />
        <Stat libelle="Encours clients" valeur={fmtEuros(encours)} detail={enRetard.length > 0 ? `${enRetard.length} facture${enRetard.length > 1 ? "s" : ""} en retard` : "Aucun retard"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Carte
          titre="Prochains coulages"
          action={
            <Link href="/app/chantiers" className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
              Tous les chantiers <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          }
        >
          {aVenir.length === 0 ? (
            <Vide titre="Aucun coulage planifié" />
          ) : (
            <ul className="divide-y divide-stone-100">
              {aVenir.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/app/chantiers/${c.id}`} className="block truncate text-sm font-medium text-stone-900 hover:text-brand-700">
                      {client(c.clientId)} · {c.ville}
                    </Link>
                    <div className="text-xs text-stone-500">
                      {fmtDate(c.dateCoulage)} à {c.heurePremierCamion ?? "—"} · {produit(c.produitId)?.nom ?? "Produit à définir"}
                    </div>
                  </div>
                  <Badge classe={libelleStatutChantier[c.statut].classe}>{libelleStatutChantier[c.statut].label}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Carte>

        <Carte
          titre="Derniers devis"
          action={
            <Link href="/app/devis" className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
              Tous les devis <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          }
        >
          <ul className="divide-y divide-stone-100">
            {devis.slice(0, 5).map((d) => {
              const r = chiffrerDevisEnregistre(d, session.entreprise, produit(d.produitId));
              return (
                <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link href={`/app/devis/${d.id}`} className="block truncate text-sm font-medium text-stone-900 hover:text-brand-700">
                      {d.numero} · {client(d.clientId)}
                    </Link>
                    <div className="truncate text-xs text-stone-500">{d.objet}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm tabular-nums">{fmtEuros(r.totaux.totalHT)} HT</span>
                    <Badge classe={libelleStatutDevis[d.statut].classe}>{libelleStatutDevis[d.statut].label}</Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        </Carte>
      </div>
    </>
  );
}
