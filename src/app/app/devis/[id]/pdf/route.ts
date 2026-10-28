import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { getStore } from "@/lib/auth/session";
import { chiffrerDevisEnregistre } from "@/lib/domain/chiffrage";
import { DevisPDF } from "@/lib/pdf/devis-pdf";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, store } = await getStore();
  const devis = await store.devis(id);
  if (!devis) return new Response("Devis introuvable", { status: 404 });
  const [client, produit] = await Promise.all([store.client(devis.clientId), devis.produitId ? store.produit(devis.produitId) : null]);
  if (!client) return new Response("Client introuvable", { status: 404 });
  const resultat = chiffrerDevisEnregistre(devis, session.entreprise, produit);

  const document = createElement(DevisPDF, { devis, resultat, entreprise: session.entreprise, client, produit }) as unknown as ReactElement<DocumentProps>;
  const buffer = await renderToBuffer(document);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="devis-${devis.numero}${devis.version > 1 ? `-v${devis.version}` : ""}.pdf"`,
    },
  });
}
