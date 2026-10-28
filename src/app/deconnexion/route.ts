import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_DEMO } from "@/lib/auth/session";
import { supabaseConfigure, supabaseServeur } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  if (supabaseConfigure()) {
    const sb = await supabaseServeur();
    await sb.auth.signOut();
  }
  const response = NextResponse.redirect(new URL("/", url.origin), { status: 303 });
  response.cookies.delete(COOKIE_DEMO);
  return response;
}
