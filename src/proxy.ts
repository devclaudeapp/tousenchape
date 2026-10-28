import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const COOKIE_DEMO = "tec_demo";

/**
 * Protège l'espace /app : sans session, redirection vers la page de connexion.
 * Avec Supabase, rafraîchit aussi le jeton de session dans les cookies.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protege = pathname.startsWith("/app");
  const configure = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!configure) {
    if (protege && request.cookies.get(COOKIE_DEMO)?.value !== "1") {
      const url = request.nextUrl.clone();
      url.pathname = "/connexion";
      url.searchParams.set("suite", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (aDefinir) => {
        for (const { name, value } of aDefinir) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of aDefinir) response.cookies.set(name, value, options);
      },
    },
  });

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (protege && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("suite", pathname);
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
