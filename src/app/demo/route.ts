import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_DEMO } from "@/lib/auth/session";
import { supabaseConfigure } from "@/lib/supabase/server";

/** Entrée en mode démonstration : pose le cookie de session démo. Désactivé quand Supabase est configuré. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (supabaseConfigure()) return NextResponse.redirect(new URL("/connexion", url.origin));
  const suite = url.searchParams.get("suite") ?? "/app";
  const response = NextResponse.redirect(new URL(suite.startsWith("/") ? suite : "/app", url.origin));
  response.cookies.set(COOKIE_DEMO, "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return response;
}
