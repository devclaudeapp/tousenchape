"use client";

import { useEffect, useRef, useState } from "react";
import { LogIn, LogOut, MapPin } from "lucide-react";
import type { Pointage } from "@/lib/domain/types";
import { fmtHeure } from "@/lib/format";

/** Boutons de pointage du compagnon : arrivée (avec le chantier du jour) et départ. La position GPS est jointe si le téléphone la donne. */
export function Pointeuse({
  pointageOuvert,
  chantiers,
  chantierParDefaut,
  pointer,
}: {
  pointageOuvert: Pointage | null;
  chantiers: { id: string; libelle: string }[];
  chantierParDefaut?: string;
  pointer: (formData: FormData) => Promise<void>;
}) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [etatGps, setEtatGps] = useState<"attente" | "ok" | "refuse">("attente");
  const [ecoule, setEcoule] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      const t = setTimeout(() => setEtatGps("refuse"), 0);
      return () => clearTimeout(t);
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: Math.round(pos.coords.latitude * 1e5) / 1e5, lng: Math.round(pos.coords.longitude * 1e5) / 1e5 });
        setEtatGps("ok");
      },
      () => setEtatGps("refuse"),
      { timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  useEffect(() => {
    if (!pointageOuvert) return;
    const tick = () => {
      const min = Math.floor((Date.now() - new Date(pointageOuvert.debut).getTime()) / 60000);
      setEcoule(`${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`);
    };
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, [pointageOuvert]);

  const gps = (
    <p className="flex items-center gap-1.5 text-xs text-stone-500">
      <MapPin className="h-3.5 w-3.5" aria-hidden />
      {etatGps === "ok" ? "Position relevée" : etatGps === "attente" ? "Recherche de la position…" : "Position indisponible (pointage sans GPS)"}
    </p>
  );

  if (pointageOuvert) {
    return (
      <form ref={formRef} action={pointer} className="carte space-y-3 border-brand-300 p-4 ring-1 ring-brand-200">
        <input type="hidden" name="mode" value="depart" />
        {position && (
          <>
            <input type="hidden" name="lat" value={position.lat} />
            <input type="hidden" name="lng" value={position.lng} />
          </>
        )}
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-800">En poste depuis {fmtHeure(pointageOuvert.debut)}</p>
            <p className="text-2xl font-semibold tabular-nums text-stone-900">{ecoule}</p>
          </div>
          {gps}
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="etiquette">Pause (min)</span>
            <input name="pauseMin" type="number" min={0} step={5} defaultValue={45} className="champ min-h-12 text-base" />
          </label>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="panier" defaultChecked={pointageOuvert.type === "chantier"} className="h-5 w-5" /> Panier repas
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="grandDeplacement" className="h-5 w-5" /> Grand déplacement
            </label>
          </div>
        </div>
        <input name="commentaire" className="champ" placeholder="Remarque (facultatif)" />
        <button type="submit" className="bouton-primaire min-h-14 w-full text-base">
          <LogOut className="h-5 w-5" aria-hidden /> Pointer mon départ
        </button>
      </form>
    );
  }

  return (
    <form ref={formRef} action={pointer} className="carte space-y-3 p-4">
      <input type="hidden" name="mode" value="arrivee" />
      {position && (
        <>
          <input type="hidden" name="lat" value={position.lat} />
          <input type="hidden" name="lng" value={position.lng} />
        </>
      )}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Pointage</p>
        {gps}
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span className="etiquette">Où êtes-vous ?</span>
        <select name="chantierId" defaultValue={chantierParDefaut ?? ""} className="champ min-h-12 text-base">
          <option value="">Au dépôt / atelier</option>
          {chantiers.map((c) => (
            <option key={c.id} value={c.id}>{c.libelle}</option>
          ))}
        </select>
      </label>
      <button type="submit" className="bouton-primaire min-h-14 w-full text-base">
        <LogIn className="h-5 w-5" aria-hidden /> Pointer mon arrivée
      </button>
    </form>
  );
}
