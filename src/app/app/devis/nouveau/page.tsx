import { getStore } from "@/lib/auth/session";
import { EnTete } from "@/components/ui";
import { EditeurDevis } from "@/components/editeur-devis";
import { enregistrerDevis } from "../actions";

export const metadata = { title: "Nouveau devis" };

export default async function NouveauDevis({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { client } = await searchParams;
  const { session, store } = await getStore();
  const [clients, produits] = await Promise.all([store.clients(), store.produits()]);

  return (
    <>
      <EnTete titre="Nouveau devis" sousTitre="Les quantités, les contrôles d'épaisseur et le prix se recalculent à chaque saisie." />
      <EditeurDevis action={enregistrerDevis.bind(null, null)} clients={clients} produits={produits} entreprise={session.entreprise} clientInitial={client} />
    </>
  );
}
