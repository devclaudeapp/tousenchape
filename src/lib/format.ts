import type { StatutChantier, StatutDevis, StatutFacture, TypeClient, TypeFacture } from "@/lib/domain/types";
import type { Liant, ModePose, Revetement } from "@/lib/chape/types";

const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const nombre = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const dateCourte = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
const dateLongue = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const heure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

export const fmtEuros = (x: number) => euros.format(x);
export const fmtNombre = (x: number) => nombre.format(x);
export const fmtDate = (iso?: string | null) => (iso ? dateCourte.format(new Date(iso)) : "—");
export const fmtDateLongue = (iso?: string | null) => (iso ? dateLongue.format(new Date(iso)) : "—");
export const fmtHeure = (iso?: string | null) => (iso ? heure.format(new Date(iso)) : "—");
export const fmtDateHeure = (iso?: string | null) => (iso ? `${fmtDate(iso)} ${fmtHeure(iso)}` : "—");

export const libelleLiant: Record<Liant, string> = {
  sulfate_calcium: "Sulfate de calcium (anhydrite)",
  ciment: "Ciment",
};

export const libelleModePose: Record<ModePose, string> = {
  adherente: "Adhérente",
  desolidarisee: "Désolidarisée",
  flottante: "Flottante sur isolant",
};

export const libelleRevetement: Record<Revetement, string> = {
  carrelage: "Carrelage",
  pierre: "Pierre naturelle",
  pvc: "PVC",
  linoleum: "Linoléum",
  caoutchouc: "Caoutchouc",
  parquet: "Parquet",
  textile: "Textile",
  resine: "Résine",
  inconnu: "Non défini",
};

export const libelleTypeClient: Record<TypeClient, string> = {
  particulier: "Particulier",
  professionnel: "Professionnel",
  collectivite: "Collectivité",
};

export const libelleStatutDevis: Record<StatutDevis, { label: string; classe: string }> = {
  brouillon: { label: "Brouillon", classe: "bg-stone-100 text-stone-700" },
  envoye: { label: "Envoyé", classe: "bg-sky-100 text-sky-800" },
  signe: { label: "Signé", classe: "bg-brand-100 text-brand-800" },
  refuse: { label: "Refusé", classe: "bg-rose-100 text-rose-800" },
  expire: { label: "Expiré", classe: "bg-amber-100 text-amber-800" },
};

export const libelleStatutChantier: Record<StatutChantier, { label: string; classe: string }> = {
  planifie: { label: "Planifié", classe: "bg-stone-100 text-stone-700" },
  preparation: { label: "Préparation", classe: "bg-sky-100 text-sky-800" },
  pret: { label: "Prêt à couler", classe: "bg-indigo-100 text-indigo-800" },
  coule: { label: "Coulé", classe: "bg-brand-100 text-brand-800" },
  sechage: { label: "Séchage", classe: "bg-amber-100 text-amber-800" },
  reception: { label: "Réception", classe: "bg-violet-100 text-violet-800" },
  facture: { label: "Facturé", classe: "bg-emerald-100 text-emerald-800" },
  clos: { label: "Clos", classe: "bg-stone-200 text-stone-600" },
};

export const libelleStatutFacture: Record<StatutFacture, { label: string; classe: string }> = {
  brouillon: { label: "Brouillon", classe: "bg-stone-100 text-stone-700" },
  emise: { label: "Émise", classe: "bg-sky-100 text-sky-800" },
  payee: { label: "Payée", classe: "bg-brand-100 text-brand-800" },
  en_retard: { label: "En retard", classe: "bg-rose-100 text-rose-800" },
  annulee: { label: "Annulée", classe: "bg-stone-200 text-stone-600" },
};

export const libelleTypeFacture: Record<TypeFacture, string> = {
  acompte: "Acompte",
  situation: "Situation",
  solde: "Solde",
  avoir: "Avoir",
};
