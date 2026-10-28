import Link from "next/link";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { getStore } from "@/lib/auth/session";
import { exiger } from "@/lib/auth/roles";
import { PARAMETRES_PAIE_DEFAUT, variablesPaieMois } from "@/lib/domain/heures";
import { fmtEuros, fmtNombre } from "@/lib/format";
import { EnTete, Stat } from "@/components/ui";

export const metadata = { title: "Variables de paie" };

const decalerMois = (mois: string, n: number) => {
  const [a, m] = mois.split("-").map(Number);
  const d = new Date(a!, m! - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default async function Paie({ searchParams }: { searchParams: Promise<{ mois?: string }> }) {
  const { mois: moisParam } = await searchParams;
  const { session, store } = await getStore();
  exiger(session, "paie");
  const mois = moisParam && /^\d{4}-\d{2}$/.test(moisParam) ? moisParam : new Date().toISOString().slice(0, 7);
  const params = session.entreprise.parametresPaie ?? PARAMETRES_PAIE_DEFAUT;

  // Les semaines à cheval sont rattachées au lundi : on charge un peu avant et après le mois.
  const [membres, pointages] = await Promise.all([store.membres(), store.pointages({ depuis: decalerMois(mois, -1) + "-20", jusqua: decalerMois(mois, 1) + "-10" })]);
  const salaries = membres.filter((m) => m.actif && m.role !== "gerant");
  const lignes = salaries.map((m) => ({ membre: m, v: variablesPaieMois(m.id, mois, pointages, params) }));
  const total = (f: (v: (typeof lignes)[number]["v"]) => number) => lignes.reduce((s, l) => s + f(l.v), 0);
  const enAttente = total((v) => v.enAttente);
  const libelleMois = new Date(`${mois}-01T00:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <>
      <EnTete
        titre="Variables de paie"
        sousTitre={`${libelleMois} · pointages validés par le bureau uniquement`}
        actions={
          <>
            <Link href={`/app/heures/paie?mois=${decalerMois(mois, -1)}`} className="bouton-secondaire" aria-label="Mois précédent"><ChevronLeft className="h-4 w-4" aria-hidden /></Link>
            <Link href={`/app/heures/paie?mois=${decalerMois(mois, 1)}`} className="bouton-secondaire" aria-label="Mois suivant"><ChevronRight className="h-4 w-4" aria-hidden /></Link>
            <a href={`/app/heures/paie/csv?mois=${mois}`} className="bouton-primaire">
              <Download className="h-4 w-4" aria-hidden /> Export CSV
            </a>
          </>
        }
      />
      {enAttente > 0 && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {enAttente} pointage{enAttente > 1 ? "s" : ""} du mois pas encore validé{enAttente > 1 ? "s" : ""} par le bureau : ils ne figurent pas dans l&apos;export.{" "}
          <Link href={`/app/heures?semaine=${mois}-01`} className="underline">Valider les heures</Link>
        </p>
      )}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat libelle="Heures" valeur={`${fmtNombre(total((v) => v.heures))} h`} detail={`${fmtNombre(total((v) => v.normales))} h normales`} />
        <Stat libelle="Heures sup. 25 %" valeur={`${fmtNombre(total((v) => v.sup25))} h`} />
        <Stat libelle="Heures sup. 50 %" valeur={`${fmtNombre(total((v) => v.sup50))} h`} />
        <Stat libelle="Indemnités" valeur={fmtEuros(total((v) => v.indemnitesEuros))} detail={`${total((v) => v.paniers)} paniers · ${total((v) => v.grandsDeplacements)} grands déplacements`} />
      </div>
      <div className="carte overflow-x-auto">
        <table className="tableau min-w-[1000px]">
          <thead>
            <tr>
              <th>Salarié</th>
              <th className="text-right">Jours</th>
              <th className="text-right">Heures</th>
              <th className="text-right">Normales</th>
              <th className="text-right">Sup 25 %</th>
              <th className="text-right">Sup 50 %</th>
              <th className="text-right">Paniers</th>
              <th>Trajets par zone</th>
              <th className="text-right">GD</th>
              <th className="text-right">Indemnités</th>
              <th className="text-right">En attente</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map(({ membre, v }) => (
              <tr key={membre.id}>
                <td>
                  <Link href={`/app/equipe/${membre.id}`} className="font-medium text-stone-900 hover:text-brand-700">{membre.nom}</Link>
                  <div className="text-xs text-stone-500">{membre.matricule ? `Matricule ${membre.matricule}` : "Sans matricule"}</div>
                </td>
                <td className="text-right tabular-nums">{v.joursTravailles}</td>
                <td className="text-right tabular-nums font-medium">{fmtNombre(v.heures)}</td>
                <td className="text-right tabular-nums">{fmtNombre(v.normales)}</td>
                <td className={`text-right tabular-nums ${v.sup25 > 0 ? "text-amber-700" : ""}`}>{fmtNombre(v.sup25)}</td>
                <td className={`text-right tabular-nums ${v.sup50 > 0 ? "text-rose-700" : ""}`}>{fmtNombre(v.sup50)}</td>
                <td className="text-right tabular-nums">{v.paniers}</td>
                <td className="text-xs text-stone-600">{Object.entries(v.trajetsParZone).map(([z, n]) => `zone ${z} × ${n}`).join(", ") || "—"}</td>
                <td className="text-right tabular-nums">{v.grandsDeplacements}</td>
                <td className="text-right tabular-nums">{fmtEuros(v.indemnitesEuros)}</td>
                <td className={`text-right tabular-nums ${v.enAttente > 0 ? "text-amber-700" : "text-stone-400"}`}>{v.enAttente}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-stone-500">
        Règles appliquées : {params.dureeHebdoH} h par semaine, majoration de 25 % jusqu&apos;à la {params.seuilMajoration50H}e heure puis 50 % ; panier {fmtEuros(params.panierEuros)} ; trajets {Object.entries(params.zonesTrajetEuros).map(([z, e]) => `zone ${z} ${fmtEuros(e)}`).join(", ")} ; grand déplacement {fmtEuros(params.grandDeplacementEuros)}. Les semaines à cheval sur deux mois sont comptées dans le mois de leur lundi. L&apos;outil ne fait pas la paie : il transmet les variables à l&apos;expert-comptable.
      </p>
    </>
  );
}
