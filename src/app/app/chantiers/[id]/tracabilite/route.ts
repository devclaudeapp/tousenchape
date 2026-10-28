import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { getStore } from "@/lib/auth/session";
import { construireFicheTracabilite } from "@/lib/domain/tracabilite";
import { TracabilitePDF } from "@/lib/pdf/tracabilite-pdf";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, store } = await getStore();
  const chantier = await store.chantier(id);
  if (!chantier) return new Response("Chantier introuvable", { status: 404 });
  const [client, produit, membres, livraisons] = await Promise.all([
    store.client(chantier.clientId),
    chantier.produitId ? store.produit(chantier.produitId) : null,
    store.membres(),
    store.livraisons(id),
  ]);
  const chef = membres.find((m) => m.id === chantier.chefEquipeId) ?? null;
  const fiche = construireFicheTracabilite({ chantier, client, entreprise: session.entreprise, produit, chef, livraisons });
  const document = createElement(TracabilitePDF, { fiche, chantier, entreprise: session.entreprise, chef }) as unknown as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(document);
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="tracabilite-${chantier.numero}.pdf"` },
  });
}
