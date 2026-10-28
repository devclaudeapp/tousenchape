import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { Navigation } from "@/components/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/connexion");
  if (!session.membre) redirect("/bienvenue");

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="flex flex-col border-b border-stone-200 bg-white lg:w-64 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/app" className="flex items-center gap-2 font-semibold text-brand-800">
            <span className="inline-block h-5 w-5 rounded bg-brand-700" aria-hidden />
            Tous en chape
          </Link>
          {session.demo && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Démo</span>}
        </div>
        <Navigation role={session.membre.role} />
        <div className="mt-auto hidden border-t border-stone-100 px-4 py-3 text-xs text-stone-500 lg:block">
          <div className="truncate font-medium text-stone-700">{session.entreprise.nom}</div>
          <div className="truncate">{session.membre.nom}</div>
          <form action="/deconnexion" method="post" className="mt-2">
            <button type="submit" className="text-stone-500 underline-offset-2 hover:text-stone-800 hover:underline">
              Se déconnecter
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
