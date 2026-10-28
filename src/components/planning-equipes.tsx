"use client";

import Link from "next/link";
import { useState, useTransition, type DragEvent } from "react";
import { AlertTriangle } from "lucide-react";
import type { Chantier, Client, Equipe, Indisponibilite, Membre, Produit } from "@/lib/domain/types";
import type { ResultatDeplacement } from "@/app/app/planning/actions";
import { chargeEquipeJour, indisponibleLe } from "@/lib/domain/alertes";
import { libelleStatutChantier } from "@/lib/format";

const JOURS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];
const SANS_EQUIPE = "__sans_equipe__";

function ajouterJours(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function PlanningEquipes({
  semaineDebut,
  equipes,
  chantiers,
  membres,
  indisponibilites,
  clients,
  produits,
  peutDeplacer,
  aujourdHui,
  deplacer,
}: {
  semaineDebut: string;
  equipes: Equipe[];
  chantiers: Chantier[];
  membres: Membre[];
  indisponibilites: Indisponibilite[];
  clients: Client[];
  produits: Produit[];
  peutDeplacer: boolean;
  aujourdHui: string;
  deplacer: (chantierId: string, dateIso: string, equipeId: string | null) => Promise<ResultatDeplacement>;
}) {
  const [enCours, startTransition] = useTransition();
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);
  const [survol, setSurvol] = useState<string | null>(null);
  const jours = Array.from({ length: 7 }, (_, i) => ajouterJours(semaineDebut, i));
  const lignes: { id: string; equipe?: Equipe }[] = [...equipes.map((e) => ({ id: e.id, equipe: e })), { id: SANS_EQUIPE }];

  const onDrop = (e: DragEvent, dateIso: string, equipeId: string) => {
    e.preventDefault();
    setSurvol(null);
    const chantierId = e.dataTransfer.getData("text/chantier");
    if (!chantierId) return;
    startTransition(async () => {
      const r = await deplacer(chantierId, dateIso, equipeId === SANS_EQUIPE ? null : equipeId);
      setMessage(r.ok ? (r.message ? { texte: r.message, erreur: false } : null) : { texte: r.message ?? "Déplacement refusé.", erreur: true });
    });
  };

  return (
    <div className={enCours ? "opacity-60 transition-opacity" : ""}>
      {message && (
        <p className={`mb-3 flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${message.erreur ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {message.texte}
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <div className="grid min-w-[980px]" style={{ gridTemplateColumns: "180px repeat(7, minmax(0, 1fr))" }}>
          <div className="border-b border-stone-200 bg-stone-50 p-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Équipe</div>
          {jours.map((j, i) => {
            const d = new Date(`${j}T00:00:00`);
            const estAujourdHui = j === aujourdHui;
            return (
              <div key={j} className={`border-b border-l border-stone-200 p-2 text-xs font-semibold uppercase tracking-wide ${estAujourdHui ? "bg-brand-50 text-brand-800" : i >= 5 ? "bg-stone-100 text-stone-400" : "bg-stone-50 text-stone-500"}`}>
                {JOURS[i]} {d.getDate()}/{String(d.getMonth() + 1).padStart(2, "0")}
              </div>
            );
          })}

          {lignes.map((ligne) => {
            const chef = ligne.equipe ? membres.find((m) => m.id === ligne.equipe!.chefId) : undefined;
            const effectif = ligne.equipe ? membres.filter((m) => m.equipeId === ligne.equipe!.id && m.actif) : [];
            return (
              <div key={ligne.id} className="contents">
                <div className="border-b border-stone-200 p-2">
                  {ligne.equipe ? (
                    <>
                      <div className="flex items-center gap-1.5 text-sm font-medium text-stone-900">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ligne.equipe.couleur }} aria-hidden />
                        {ligne.equipe.nom}
                      </div>
                      <div className="text-xs text-stone-500">
                        {chef ? chef.nom : <span className="text-rose-700">chef à désigner</span>}
                        {chef && !chef.cqpNumero && <span className="text-rose-700"> · sans CQP</span>}
                      </div>
                      <div className="text-xs text-stone-400">{effectif.length} pers. · {ligne.equipe.capaciteM2Jour} m²/j</div>
                    </>
                  ) : (
                    <div className="text-sm font-medium text-stone-500">Sans équipe</div>
                  )}
                </div>
                {jours.map((j) => {
                  const duJour = chantiers.filter((c) => c.dateCoulage === j && (ligne.equipe ? c.equipeId === ligne.equipe.id : !c.equipeId));
                  const charge = ligne.equipe ? chargeEquipeJour(chantiers, ligne.equipe.id, j) : 0;
                  const capacite = ligne.equipe?.capaciteM2Jour ?? 0;
                  const taux = capacite > 0 ? charge / capacite : 0;
                  const absents = effectif.filter((m) => indisponibleLe(indisponibilites, m.id, j));
                  const cle = `${ligne.id}|${j}`;
                  const dimanche = new Date(`${j}T00:00:00`).getDay() === 0;
                  return (
                    <div
                      key={cle}
                      onDragOver={(e) => {
                        if (!peutDeplacer) return;
                        e.preventDefault();
                        setSurvol(cle);
                      }}
                      onDragLeave={() => setSurvol((s) => (s === cle ? null : s))}
                      onDrop={(e) => peutDeplacer && onDrop(e, j, ligne.id)}
                      className={`min-h-24 border-b border-l border-stone-200 p-1.5 transition-colors ${survol === cle ? "bg-brand-50 ring-2 ring-inset ring-brand-300" : dimanche ? "bg-stone-50" : ""}`}
                    >
                      {ligne.equipe && charge > 0 && (
                        <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-stone-100" title={`${charge} m² sur ${capacite} m²`}>
                          <div className={`h-full ${taux > 1 ? "bg-rose-500" : taux > 0.8 ? "bg-amber-400" : "bg-brand-500"}`} style={{ width: `${Math.min(100, taux * 100)}%` }} />
                        </div>
                      )}
                      {absents.length > 0 && (
                        <div className="mb-1 flex flex-wrap gap-1">
                          {absents.map((m) => (
                            <span key={m.id} className={`rounded px-1 text-[10px] ${m.id === ligne.equipe?.chefId ? "bg-rose-100 text-rose-800" : "bg-stone-100 text-stone-600"}`}>
                              {m.nom.split(" ")[0]} absent
                            </span>
                          ))}
                        </div>
                      )}
                      <ul className="space-y-1">
                        {duJour.map((c) => {
                          const chefChantier = membres.find((m) => m.id === c.chefEquipeId);
                          const chefAbsent = chefChantier ? indisponibleLe(indisponibilites, chefChantier.id, j) : undefined;
                          const fige = ["coule", "sechage", "reception", "facture", "clos"].includes(c.statut);
                          return (
                            <li
                              key={c.id}
                              draggable={peutDeplacer && !fige}
                              onDragStart={(e) => {
                                e.dataTransfer.setData("text/chantier", c.id);
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              className={`rounded border bg-white p-1.5 text-xs shadow-xs ${peutDeplacer && !fige ? "cursor-grab active:cursor-grabbing" : ""} ${chefAbsent ? "border-rose-300" : "border-stone-200"}`}
                              style={{ borderLeftWidth: 3, borderLeftColor: ligne.equipe?.couleur ?? "#a8a29e" }}
                            >
                              <Link href={`/app/chantiers/${c.id}`} className="block font-medium text-stone-900 hover:text-brand-700">
                                {c.heurePremierCamion ?? "—"} · {clients.find((x) => x.id === c.clientId)?.nom ?? "Client"}
                              </Link>
                              <div className="truncate text-stone-500">
                                {c.ville} · {c.surfacePrevueM2 ? `${c.surfacePrevueM2} m² · ` : ""}
                                {produits.find((p) => p.id === c.produitId)?.nom ?? "produit ?"}
                              </div>
                              <div className="mt-1 flex items-center justify-between gap-1">
                                <span className={`rounded-full px-1.5 py-0.5 ${libelleStatutChantier[c.statut].classe}`}>{libelleStatutChantier[c.statut].label}</span>
                                {c.renforts && c.renforts.length > 0 && <span className="text-stone-500">+{c.renforts.length} renfort</span>}
                              </div>
                              {chefAbsent && <div className="mt-1 text-rose-700">Chef absent ce jour</div>}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      {peutDeplacer && <p className="mt-2 text-xs text-stone-500">Glissez un chantier vers un autre jour ou une autre équipe. La barre colorée mesure la charge du jour par rapport à la capacité de l&apos;équipe.</p>}
    </div>
  );
}
