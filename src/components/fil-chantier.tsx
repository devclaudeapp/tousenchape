"use client";

import { useRef, useState } from "react";
import { Camera, CheckCircle2, Send } from "lucide-react";
import type { Membre, Message } from "@/lib/domain/types";
import { fmtDateHeure } from "@/lib/format";

/** Réduit une photo côté téléphone avant envoi : 1 280 px de côté au plus, JPEG à 72 %. */
async function compresserImage(fichier: File): Promise<string> {
  const bitmap = await createImageBitmap(fichier);
  const ratio = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
}

export function FilChantier({
  messages,
  membres,
  moiId,
  bureau,
  publier,
  traiter,
}: {
  messages: Message[];
  membres: Membre[];
  moiId: string;
  bureau: boolean;
  publier: (formData: FormData) => Promise<void>;
  traiter: (messageId: string) => Promise<void>;
}) {
  const [photo, setPhoto] = useState<string>("");
  const [enCompression, setEnCompression] = useState(false);
  const fichierRef = useRef<HTMLInputElement>(null);

  const onFichier = async (f: File | undefined) => {
    if (!f) return setPhoto("");
    setEnCompression(true);
    try {
      setPhoto(await compresserImage(f));
    } finally {
      setEnCompression(false);
    }
  };

  return (
    <div>
      {messages.length === 0 ? (
        <p className="text-sm text-stone-500">Aucun message. Le fil remplace le groupe WhatsApp du chantier : tout y reste, daté et attribué.</p>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => {
            const auteur = membres.find((x) => x.id === m.auteurId);
            const moi = m.auteurId === moiId;
            return (
              <li key={m.id} className={`flex ${moi ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.signalement && !m.traiteLe ? "border border-rose-300 bg-rose-50" : moi ? "bg-brand-50" : "bg-stone-100"}`}>
                  <div className="mb-0.5 flex items-center gap-2 text-xs text-stone-500">
                    <span className="font-medium text-stone-700">{auteur?.nom ?? "—"}</span>
                    <span>{fmtDateHeure(m.createdAt)}</span>
                    {m.signalement && (m.traiteLe ? <span className="inline-flex items-center gap-1 text-brand-700"><CheckCircle2 className="h-3 w-3" aria-hidden /> traité</span> : <span className="font-medium text-rose-700">signalement</span>)}
                  </div>
                  <p className="whitespace-pre-line text-stone-900">{m.texte}</p>
                  {m.photoUrl && (
                    <a href={m.photoUrl} target="_blank" rel="noopener" className="mt-2 block">
                      {/* eslint-disable-next-line @next/next/no-img-element -- photo de chantier, data URL ou URL signée */}
                      <img src={m.photoUrl} alt="Photo de chantier" className="max-h-56 rounded-md object-cover" />
                    </a>
                  )}
                  {m.signalement && !m.traiteLe && bureau && (
                    <form action={traiter.bind(null, m.id)} className="mt-2">
                      <button type="submit" className="bouton-secondaire py-1 text-xs">Marquer traité</button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form
        action={publier}
        onSubmit={() => {
          setTimeout(() => {
            setPhoto("");
            if (fichierRef.current) fichierRef.current.value = "";
          }, 50);
        }}
        className="mt-4 space-y-2 rounded-md border border-stone-200 bg-stone-50 p-3"
      >
        <textarea name="texte" rows={2} className="champ" placeholder="Un message pour le bureau ou l'équipe…" />
        <input type="hidden" name="photo" value={photo} />
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- aperçu local avant envoi
          <img src={photo} alt="Aperçu" className="max-h-40 rounded-md" />
        )}
        <div className="flex flex-wrap items-center gap-3">
          <label className="bouton-secondaire min-h-11 cursor-pointer">
            <Camera className="h-5 w-5" aria-hidden /> {enCompression ? "Compression…" : photo ? "Changer la photo" : "Photo"}
            <input ref={fichierRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => onFichier(e.target.files?.[0])} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="signalement" /> Signaler un problème (alerte le patron)
          </label>
          <button type="submit" disabled={enCompression} className="bouton-primaire ml-auto min-h-11">
            <Send className="h-4 w-4" aria-hidden /> Envoyer
          </button>
        </div>
      </form>
    </div>
  );
}
