import { EnTete } from "@/components/ui";
import { FormulaireClient } from "@/components/formulaire-client";
import { creerClient } from "../actions";

export const metadata = { title: "Nouveau client" };

export default async function NouveauClient({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite } = await searchParams;
  return (
    <div className="mx-auto max-w-3xl">
      <EnTete titre="Nouveau client" sousTitre="Le SIREN et l'adresse de facturation sont nécessaires à la facture électronique." />
      <FormulaireClient action={creerClient} suite={suite} />
    </div>
  );
}
