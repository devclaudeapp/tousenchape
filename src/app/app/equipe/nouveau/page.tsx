import { redirect } from "next/navigation";
import { getStore } from "@/lib/auth/session";
import { estBureau } from "@/lib/auth/roles";
import { EnTete } from "@/components/ui";
import { FormulaireMembre } from "@/components/formulaire-membre";
import { creerMembre } from "../actions";

export const metadata = { title: "Nouveau compagnon" };

export default async function NouveauMembre() {
  const { session, store } = await getStore();
  if (!estBureau(session)) redirect("/app/equipe");
  const equipes = await store.equipes();
  return (
    <div className="mx-auto max-w-3xl">
      <EnTete titre="Nouveau compagnon" sousTitre="Les habilitations et la carte BTP s'ajoutent ensuite depuis la fiche." />
      <FormulaireMembre action={creerMembre} equipes={equipes} />
    </div>
  );
}
