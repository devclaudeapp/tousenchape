import { NextResponse, type NextRequest } from "next/server";
import { supabaseServeur } from "@/lib/supabase/server";

/** Retour du lien magique : échange du code contre une session, puis redirection. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const suite = url.searchParams.get("suite") ?? "/app";
  if (code) {
    const sb = await supabaseServeur();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) return NextResponse.redirect(new URL(`/connexion?erreur=${encodeURIComponent(error.message)}`, url.origin));
  }
  return NextResponse.redirect(new URL(suite.startsWith("/") ? suite : "/app", url.origin));
}
