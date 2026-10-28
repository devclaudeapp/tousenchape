import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getStore } from "@/lib/auth/session";
import { estBureau, exiger } from "@/lib/auth/roles";
import { EnTete } from "@/components/ui";
import { PlanningEquipes } from "@/components/planning-equipes";
import { deplacerChantier } from "./actions";

export const metadata = { title: "Planning" };

function lundiDe(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  const jour = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - jour);
  return d.toISOString().slice(0, 10);
}
function decaler(iso: string, jours: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + jours);
  return d.toISOString().slice(0, 10);
}

export default async function Planning({ searchParams }: { searchParams: Promise<{ semaine?: string }> }) {
  const { semaine } = await searchParams;
  const { session, store } = await getStore();
  exiger(session, "planning");
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const debut = lundiDe(semaine && /^\d{4}-\d{2}-\d{2}$/.test(semaine) ? semaine : aujourdHui);
  const [chantiers, clients, membres, produits, equipes, indisponibilites] = await Promise.all([
    store.chantiers(),
    store.clients(),
    store.membres(),
    store.produits(),
    store.equipes(),
    store.indisponibilites(),
  ]);
  const planifiables = chantiers.filter((c) => c.statut !== "clos" && c.statut !== "facture");
  const sansDate = planifiables.filter((c) => !c.dateCoulage);
  const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  return (
    <>
      <EnTete
        titre="Planning des coulages"
        sousTitre={`Semaine du ${fmt(debut)} au ${fmt(decaler(debut, 6))}`}
        actions={
          <>
            <Link href={`/app/planning?semaine=${decaler(debut, -7)}`} className="bouton-secondaire" aria-label="Semaine précédente">
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/app/planning" className="bouton-secondaire">
              Cette semaine
            </Link>
            <Link href={`/app/planning?semaine=${decaler(debut, 7)}`} className="bouton-secondaire" aria-label="Semaine suivante">
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </>
        }
      />
      {sansDate.length > 0 && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          À planifier :{" "}
          {sansDate.map((c, i) => (
            <span key={c.id}>
              {i > 0 && ", "}
              <Link href={`/app/chantiers/${c.id}`} className="underline">
                {c.numero}
              </Link>
              {c.surfacePrevueM2 ? ` (${c.surfacePrevueM2} m²)` : ""}
            </span>
          ))}
        </p>
      )}
      <PlanningEquipes
        semaineDebut={debut}
        equipes={equipes}
        chantiers={planifiables}
        membres={membres}
        indisponibilites={indisponibilites}
        clients={clients}
        produits={produits}
        peutDeplacer={estBureau(session) || session.membre.role === "chef_equipe"}
        aujourdHui={aujourdHui}
        deplacer={deplacerChantier}
      />
    </>
  );
}
