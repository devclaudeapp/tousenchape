import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseServeur } from "@/lib/supabase/server";

export const metadata = { title: "Bienvenue" };

async function creerEntreprise(formData: FormData) {
  "use server";
  const sb = await supabaseServeur();
  const { error } = await sb.rpc("creer_entreprise", {
    p_nom: String(formData.get("nom") ?? "").trim(),
    p_siren: String(formData.get("siren") ?? "").trim(),
    p_nom_gerant: String(formData.get("gerant") ?? "").trim(),
  });
  if (error) redirect(`/bienvenue?erreur=${encodeURIComponent(error.message)}`);
  redirect("/app");
}

/** Premier accès d'un utilisateur sans entreprise : création de son espace. */
export default async function Bienvenue({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/connexion");
  if (session.membre) redirect("/app");
  const { erreur } = await searchParams;

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-xl font-semibold text-stone-900">Bienvenue sur Tous en chape</h1>
      <p className="mt-2 text-sm text-stone-600">Créez l&apos;espace de votre entreprise. Vous en serez le gérant et pourrez inviter votre équipe ensuite.</p>
      <form action={creerEntreprise} className="carte mt-6 space-y-4 p-6">
        <div>
          <label htmlFor="nom" className="etiquette">Raison sociale</label>
          <input id="nom" name="nom" required className="champ" />
        </div>
        <div>
          <label htmlFor="siren" className="etiquette">SIREN</label>
          <input id="siren" name="siren" inputMode="numeric" className="champ" placeholder="123 456 789" />
        </div>
        <div>
          <label htmlFor="gerant" className="etiquette">Votre nom</label>
          <input id="gerant" name="gerant" required className="champ" />
        </div>
        {erreur && <p className="text-sm text-rose-700">{erreur}</p>}
        <button type="submit" className="bouton-primaire w-full">Créer mon espace</button>
      </form>
    </main>
  );
}
