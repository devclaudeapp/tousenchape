import { cookies } from "next/headers";
import { cache } from "react";
import { DEMO_ENTREPRISE_ID, demoEntreprise, demoMembres } from "@/lib/data/demo-data";
import { MemoryStore } from "@/lib/data/memory-store";
import type { DataStore } from "@/lib/data/store";
import { SupabaseStore } from "@/lib/data/supabase-store";
import type { Entreprise, Membre, Session } from "@/lib/domain/types";
import { supabaseConfigure, supabaseServeur } from "@/lib/supabase/server";

export const COOKIE_DEMO = "tec_demo";

/** Session de l'utilisateur courant, ou null. Mise en cache le temps d'une requête. */
export const getSession = cache(async (): Promise<Session | null> => {
  const cookieStore = await cookies();

  if (!supabaseConfigure()) {
    if (cookieStore.get(COOKIE_DEMO)?.value !== "1") return null;
    const membre = demoMembres[0]!;
    return { userId: "demo-user", email: membre.email, membre, entreprise: demoEntreprise, demo: true };
  }

  const sb = await supabaseServeur();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data: membre } = await sb.from("membres").select("*").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membre) return { userId: user.id, email: user.email ?? "", membre: null as unknown as Membre, entreprise: null as unknown as Entreprise, demo: false };

  const store = new SupabaseStore(sb, membre.entreprise_id as string);
  const entreprise = await store.entreprise();
  return {
    userId: user.id,
    email: user.email ?? "",
    membre: {
      id: membre.id,
      entrepriseId: membre.entreprise_id,
      nom: membre.nom,
      email: membre.email,
      role: membre.role,
      equipe: membre.equipe ?? undefined,
      cqpNumero: membre.cqp_numero ?? undefined,
      cqpDate: membre.cqp_date ?? undefined,
    },
    entreprise,
    demo: false,
  };
});

/** Session obligatoire : lève une erreur si l'utilisateur n'est pas connecté (le proxy redirige avant). */
export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s || !s.membre) throw new Error("Connexion requise.");
  return s;
}

/** Magasin de données de la session courante. */
export async function getStore(): Promise<{ session: Session; store: DataStore }> {
  const session = await requireSession();
  if (session.demo) return { session, store: new MemoryStore() };
  const sb = await supabaseServeur();
  return { session, store: new SupabaseStore(sb, session.entreprise.id) };
}

export { DEMO_ENTREPRISE_ID };
