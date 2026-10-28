import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseConfigure } from "@/lib/supabase/server";
import { envoyerLienMagique } from "./actions";

export const metadata = { title: "Connexion" };

export default async function Connexion({ searchParams }: { searchParams: Promise<{ suite?: string; envoye?: string; erreur?: string }> }) {
  const session = await getSession();
  if (session) redirect("/app");
  const params = await searchParams;
  const configure = supabaseConfigure();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-semibold text-brand-800">
        <span className="inline-block h-6 w-6 rounded bg-brand-700" aria-hidden />
        Tous en chape
      </Link>

      <div className="carte p-6">
        <h1 className="text-lg font-semibold text-stone-900">Connexion</h1>

        {configure ? (
          params.envoye ? (
            <p className="mt-4 rounded-md border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800">
              Un lien de connexion vient d&apos;être envoyé à <strong>{params.envoye}</strong>. Ouvrez-le depuis cet appareil.
            </p>
          ) : (
            <form action={envoyerLienMagique} className="mt-4 space-y-4">
              <input type="hidden" name="suite" value={params.suite ?? "/app"} />
              <div>
                <label htmlFor="email" className="etiquette">
                  Adresse e-mail
                </label>
                <input id="email" name="email" type="email" required autoComplete="email" className="champ" placeholder="vous@entreprise.fr" />
              </div>
              {params.erreur && <p className="text-sm text-rose-700">{params.erreur}</p>}
              <button type="submit" className="bouton-primaire w-full">
                Recevoir un lien de connexion
              </button>
              <p className="text-xs text-stone-500">Pas de mot de passe : un lien à usage unique est envoyé par e-mail.</p>
            </form>
          )
        ) : (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-stone-600">
              Supabase n&apos;est pas configuré : l&apos;application tourne en <strong>mode démonstration</strong>, avec une entreprise fictive et des données en mémoire.
            </p>
            <Link href={`/demo?suite=${encodeURIComponent(params.suite ?? "/app")}`} className="bouton-primaire w-full">
              Entrer dans la démonstration
            </Link>
            <p className="text-xs text-stone-500">
              Pour un vrai compte, renseignez <code>NEXT_PUBLIC_SUPABASE_URL</code> et <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (voir le README).
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
