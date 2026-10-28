import { cookies } from "next/headers";
import { cache } from "react";
import { DEMO_ENTREPRISE_ID, demoMembres } from "@/lib/data/demo-data";
import { MemoryStore } from "@/lib/data/memory-store";
import type { DataStore } from "@/lib/data/store";
import { SupabaseStore } from "@/lib/data/supabase-store";
import type { Entreprise, Membre, Session } from "@/lib/domain/types";
import { supabaseConfigure, supabaseServeur } from "@/lib/supabase/server";

export const COOKIE_DEMO = "tec_demo";
/** En démo, membre incarné (pour voir l'application comme le bureau ou un chef d'équipe). */
export const COOKIE_DEMO_MEMBRE = "tec_demo_membre";

/** Session de l'utilisateur courant, ou null. Mise en cache le temps d'une requête. */
export const getSession = cache(async (): Promise<Session | null> => {
  const cookieStore = await cookies();

  if (!supabaseConfigure()) {
    if (cookieStore.get(COOKIE_DEMO)?.value !== "1") return null;
    const store = new MemoryStore();
    const [membres, entreprise] = await Promise.all([store.membres(), store.entreprise()]);
    const voulu = cookieStore.get(COOKIE_DEMO_MEMBRE)?.value;
    const membre = membres.find((m) => m.id === voulu && m.actif) ?? membres.find((m) => m.id === demoMembres[0]!.id) ?? demoMembres[0]!;
    return { userId: `demo-${membre.id}`, email: membre.email, membre, entreprise, demo: true };
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
      telephone: membre.telephone ?? undefined,
      equipeId: membre.equipe_id ?? undefined,
      typeContrat: membre.type_contrat ?? undefined,
      dateEntree: membre.date_entree ?? undefined,
      cqpNumero: membre.cqp_numero ?? undefined,
      cqpDate: membre.cqp_date ?? undefined,
      habilitations: membre.habilitations ?? [],
      actif: membre.actif ?? true,
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
