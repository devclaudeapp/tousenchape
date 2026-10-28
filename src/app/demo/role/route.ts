import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_DEMO_MEMBRE } from "@/lib/auth/session";
import { supabaseConfigure } from "@/lib/supabase/server";

/** Mode démo : choisir le membre incarné (gérant, bureau, chef d'équipe, applicateur). */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (supabaseConfigure()) return NextResponse.redirect(new URL("/app", url.origin));
  const membre = url.searchParams.get("membre") ?? "";
  const response = NextResponse.redirect(new URL("/app", url.origin));
  if (/^[a-z0-9-]+$/i.test(membre)) response.cookies.set(COOKIE_DEMO_MEMBRE, membre, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return response;
}
