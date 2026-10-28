"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, CalendarDays, Clock, FileText, FolderLock, HardHat, LayoutDashboard, Receipt, Settings, Sun, TrendingUp, UserCog, Users, Wrench } from "lucide-react";
import type { RoleMembre } from "@/lib/domain/types";

const liens = [
  { href: "/app/ma-journee", label: "Ma journée", icone: Sun, roles: ["chef_equipe", "applicateur"] },
  { href: "/app", label: "Tableau de bord", icone: LayoutDashboard, roles: ["gerant", "bureau", "chef_equipe", "applicateur"] },
  { href: "/app/devis", label: "Devis", icone: FileText, roles: ["gerant", "bureau", "chef_equipe"] },
  { href: "/app/chantiers", label: "Chantiers", icone: HardHat, roles: ["gerant", "bureau", "chef_equipe", "applicateur"] },
  { href: "/app/planning", label: "Planning", icone: CalendarDays, roles: ["gerant", "bureau", "chef_equipe", "applicateur"] },
  { href: "/app/equipe", label: "Équipe", icone: UserCog, roles: ["gerant", "bureau", "chef_equipe", "applicateur"] },
  { href: "/app/heures", label: "Heures", icone: Clock, roles: ["gerant", "bureau", "chef_equipe"] },
  { href: "/app/materiel", label: "Matériel", icone: Wrench, roles: ["gerant", "bureau", "chef_equipe", "applicateur"] },
  { href: "/app/agenda", label: "Agenda", icone: CalendarClock, roles: ["gerant", "bureau", "chef_equipe"] },
  { href: "/app/clients", label: "Clients", icone: Users, roles: ["gerant", "bureau"] },
  { href: "/app/factures", label: "Factures", icone: Receipt, roles: ["gerant", "bureau"] },
  { href: "/app/rentabilite", label: "Rentabilité", icone: TrendingUp, roles: ["gerant"] },
  { href: "/app/documents", label: "Documents", icone: FolderLock, roles: ["gerant", "bureau"] },
  { href: "/app/parametres", label: "Paramètres", icone: Settings, roles: ["gerant", "bureau"] },
] as const;

export function Navigation({ role }: { role: RoleMembre }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-col lg:px-3 lg:pb-0" aria-label="Navigation principale">
      {liens
        .filter((l) => (l.roles as readonly string[]).includes(role))
        .map((l) => {
          const actif = l.href === "/app" ? pathname === "/app" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={actif ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                actif ? "bg-brand-50 text-brand-800" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              }`}
            >
              <l.icone className="h-4 w-4" aria-hidden />
              {l.label}
            </Link>
          );
        })}
    </nav>
  );
}
