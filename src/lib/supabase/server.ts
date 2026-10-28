import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Supabase est configuré quand l'URL et la clé publique sont présentes ; sinon l'application tourne en mode démo. */
export function supabaseConfigure(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** Client Supabase côté serveur (Server Components, Server Actions, Route Handlers), avec les cookies de session. */
export async function supabaseServeur() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (aDefinir) => {
        try {
          for (const { name, value, options } of aDefinir) cookieStore.set(name, value, options);
        } catch {
          // Appel depuis un Server Component : les cookies sont rafraîchis par le proxy.
        }
      },
    },
  });
}
