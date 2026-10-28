import Link from "next/link";
import { Calculator, CalendarDays, ClipboardCheck, Receipt } from "lucide-react";
import { supabaseConfigure } from "@/lib/supabase/server";

const modules = [
  { icone: Calculator, titre: "Devis en 10 minutes", texte: "Volume, toupies, film, bande périphérique et prix calculés pièce par pièce. Une épaisseur sous le minimum des Règles professionnelles bloque le devis." },
  { icone: CalendarDays, titre: "Chantiers et coulages", texte: "Fiche chantier, commande à la centrale, jalons automatiques après coulage : circulation, second œuvre, mise en chauffe, séchage estimé." },
  { icone: ClipboardCheck, titre: "Traçabilité QB46", texte: "Bons de livraison contrôlés à la toupie (étalement, eau, temps d'utilisation) et fiche de traçabilité générée sans ressaisie, signée par le chef d'équipe CQP." },
  { icone: Receipt, titre: "Facturation conforme", texte: "Acompte, solde, autoliquidation en sous-traitance, taux réduit certifié par le client, mentions obligatoires, format Factur-X." },
];

export default function Accueil() {
  const demo = !supabaseConfigure();
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:py-20">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-semibold text-brand-800">
          <span className="inline-block h-6 w-6 rounded bg-brand-700" aria-hidden />
          Tous en chape
        </div>
        <Link href="/connexion" className="bouton-secondaire">
          Connexion
        </Link>
      </header>

      <section className="mt-16 max-w-2xl">
        <h1 className="text-4xl font-semibold leading-tight text-stone-900 sm:text-5xl">
          Le logiciel des entreprises de chape fluide.
        </h1>
        <p className="mt-5 text-lg text-stone-600">
          Du devis au PV de réception : calculs selon les Règles professionnelles 2023, planning des coulages, traçabilité QB46 et facturation, sur ordinateur au bureau et sur téléphone au chantier.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={demo ? "/demo" : "/connexion"} className="bouton-primaire px-5 py-2.5 text-base">
            {demo ? "Ouvrir la démonstration" : "Se connecter"}
          </Link>
          <a href="#modules" className="bouton-secondaire px-5 py-2.5 text-base">
            Voir les modules
          </a>
        </div>
      </section>

      <section id="modules" className="mt-20 grid gap-6 sm:grid-cols-2">
        {modules.map((m) => (
          <article key={m.titre} className="carte p-6">
            <m.icone className="h-6 w-6 text-brand-700" aria-hidden />
            <h2 className="mt-3 text-base font-semibold text-stone-900">{m.titre}</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">{m.texte}</p>
          </article>
        ))}
      </section>

      <footer className="mt-20 border-t border-stone-200 pt-6 text-xs text-stone-500">
        Références : Règles professionnelles pour la mise en œuvre des chapes fluides à base de ciment ou de sulfate de calcium (UNECP-FFB / CAPEB, janvier 2023) ; certification QB46 du CSTB.
      </footer>
    </main>
  );
}
