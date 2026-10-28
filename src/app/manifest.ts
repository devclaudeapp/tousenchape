import type { MetadataRoute } from "next";

/** Manifeste PWA : l'application s'ajoute à l'écran d'accueil du téléphone et s'ouvre plein écran. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tous en chape",
    short_name: "Tous en chape",
    description: "Devis, chantiers, équipes, traçabilité QB46 et facturation pour les entreprises de chape fluide.",
    start_url: "/app",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#116959",
    lang: "fr",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
