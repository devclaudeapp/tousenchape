import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Tous en chape", template: "%s · Tous en chape" },
  description: "Devis, chantiers, traçabilité QB46 et facturation pour les entreprises de chape fluide.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icone-192.png", apple: "/icone-180.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Tous en chape" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#116959",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
