import { getStore } from "@/lib/auth/session";
import { estBureau } from "@/lib/auth/roles";
import { PARAMETRES_PAIE_DEFAUT, csvVariablesPaie, variablesPaieMois } from "@/lib/domain/heures";

const decalerMois = (mois: string, n: number) => {
  const [a, m] = mois.split("-").map(Number);
  const d = new Date(a!, m! - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export async function GET(request: Request) {
  const { session, store } = await getStore();
  if (!estBureau(session)) return new Response("Réservé au bureau", { status: 403 });
  const url = new URL(request.url);
  const mois = url.searchParams.get("mois") ?? new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(mois)) return new Response("Mois invalide", { status: 400 });
  const params = session.entreprise.parametresPaie ?? PARAMETRES_PAIE_DEFAUT;
  const [membres, pointages] = await Promise.all([store.membres(), store.pointages({ depuis: decalerMois(mois, -1) + "-20", jusqua: decalerMois(mois, 1) + "-10" })]);
  const lignes = membres.filter((m) => m.actif && m.role !== "gerant").map((m) => ({ nom: m.nom, matricule: m.matricule, v: variablesPaieMois(m.id, mois, pointages, params) }));
  // BOM pour qu'Excel ouvre le fichier en UTF-8.
  const csv = "﻿" + csvVariablesPaie(lignes);
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="variables-paie-${mois}.csv"` },
  });
}
