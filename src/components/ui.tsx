import type { ReactNode } from "react";
import type { Alerte } from "@/lib/chape/types";
import { AlertTriangle, Info, OctagonX } from "lucide-react";

export function Badge({ children, classe = "bg-stone-100 text-stone-700" }: { children: ReactNode; classe?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classe}`}>{children}</span>;
}

export function Carte({ titre, action, children, classe = "" }: { titre?: ReactNode; action?: ReactNode; children: ReactNode; classe?: string }) {
  return (
    <section className={`carte ${classe}`}>
      {(titre || action) && (
        <header className="flex items-center justify-between gap-4 border-b border-stone-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-stone-800">{titre}</h2>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Stat({ libelle, valeur, detail, accent = false }: { libelle: string; valeur: ReactNode; detail?: ReactNode; accent?: boolean }) {
  return (
    <div className="carte p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-stone-500">{libelle}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${accent ? "text-brand-700" : "text-stone-900"}`}>{valeur}</div>
      {detail && <div className="mt-1 text-xs text-stone-500">{detail}</div>}
    </div>
  );
}

export function Vide({ titre, detail, action }: { titre: string; detail?: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center">
      <p className="text-sm font-medium text-stone-700">{titre}</p>
      {detail && <p className="mt-1 text-sm text-stone-500">{detail}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function EnTete({ titre, sousTitre, actions }: { titre: ReactNode; sousTitre?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">{titre}</h1>
        {sousTitre && <p className="mt-1 text-sm text-stone-500">{sousTitre}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const styleAlerte = {
  bloquant: { icone: OctagonX, classe: "border-rose-200 bg-rose-50 text-rose-900", iconeClasse: "text-rose-600" },
  attention: { icone: AlertTriangle, classe: "border-amber-200 bg-amber-50 text-amber-900", iconeClasse: "text-amber-600" },
  info: { icone: Info, classe: "border-sky-200 bg-sky-50 text-sky-900", iconeClasse: "text-sky-600" },
} as const;

export function ListeAlertes({ alertes, vide }: { alertes: Alerte[]; vide?: string }) {
  if (alertes.length === 0) {
    return vide ? <p className="rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800">{vide}</p> : null;
  }
  return (
    <ul className="space-y-2">
      {alertes.map((a, i) => {
        const s = styleAlerte[a.severite];
        const Icone = s.icone;
        return (
          <li key={`${a.code}-${i}`} className={`flex gap-2.5 rounded-md border px-3 py-2 text-sm ${s.classe}`}>
            <Icone className={`mt-0.5 h-4 w-4 shrink-0 ${s.iconeClasse}`} aria-hidden />
            <div>
              <p>{a.message}</p>
              {a.reference && <p className="mt-0.5 text-xs opacity-70">{a.reference}</p>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function Definition({ items }: { items: { libelle: string; valeur: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.libelle}>
          <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{it.libelle}</dt>
          <dd className="mt-0.5 text-sm text-stone-900">{it.valeur}</dd>
        </div>
      ))}
    </dl>
  );
}
