import { redirect } from "next/navigation";
import type { RoleMembre, Session } from "@/lib/domain/types";

/**
 * Droits par rôle. Un rôle par défaut suffit ; les permissions fines viendront en V1.
 *
 * | Module                | gérant | bureau | chef d'équipe | applicateur |
 * | devis, clients        |   É    |   É    |   L (siens)   |      —      |
 * | chantiers, planning   |   É    |   É    |   É (équipe)  |  L (siens)  |
 * | équipe                |   É    |   É    |  L (équipe)   |  L (lui)    |
 * | factures, paramètres  |   É    |   É/L  |       —       |      —      |
 */
export const DROITS: Record<string, RoleMembre[]> = {
  devis: ["gerant", "bureau", "chef_equipe"],
  clients: ["gerant", "bureau"],
  chantiers: ["gerant", "bureau", "chef_equipe", "applicateur"],
  planning: ["gerant", "bureau", "chef_equipe", "applicateur"],
  equipe: ["gerant", "bureau", "chef_equipe", "applicateur"],
  factures: ["gerant", "bureau"],
  parametres: ["gerant", "bureau"],
  ma_journee: ["chef_equipe", "applicateur", "gerant", "bureau"],
  heures: ["gerant", "bureau", "chef_equipe"],
  paie: ["gerant", "bureau"],
  materiel: ["gerant", "bureau", "chef_equipe", "applicateur"],
  rentabilite: ["gerant"],
  agenda: ["gerant", "bureau", "chef_equipe"],
  documents: ["gerant", "bureau"],
};

/** Redirige vers le tableau de bord si le rôle n'a pas accès au module. */
export function exiger(session: Session, module: keyof typeof DROITS): void {
  const roles = DROITS[module] ?? [];
  if (!roles.includes(session.membre.role)) redirect("/app?refus=" + module);
}

export const estBureau = (session: Session) => session.membre.role === "gerant" || session.membre.role === "bureau";
export const estTerrain = (session: Session) => session.membre.role === "chef_equipe" || session.membre.role === "applicateur";
