"use server";

import { redirect } from "next/navigation";
import { supabaseServeur } from "@/lib/supabase/server";

export async function envoyerLienMagique(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const suite = String(formData.get("suite") ?? "/app");
  if (!email) redirect("/connexion?erreur=Adresse%20e-mail%20requise");

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const sb = await supabaseServeur();
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${base}/auth/callback?suite=${encodeURIComponent(suite)}` },
  });
  if (error) redirect(`/connexion?erreur=${encodeURIComponent(error.message)}`);
  redirect(`/connexion?envoye=${encodeURIComponent(email)}`);
}
