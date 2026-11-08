import type { Metadata, Viewport } from "next";

import "./globals.css";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { MissionProvider } from "@/components/mission/MissionProvider";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import { AutoTranslate } from "@/components/i18n/AutoTranslate";
import { OfflineSupport } from "@/components/offline/OfflineSupport";

export const metadata: Metadata = {
  title: {
    default: "Ndao Hifanosika - Plateforme de Suivi & Évaluation",
    template: "%s | Ndao Hifanosika",
  },

  description:
    "Plateforme intégrée de suivi et évaluation des projets, équipes et bénéficiaires",

  keywords: [
    "ONG",
    "suivi-évaluation",
    "S&E",
    "bénéficiaires",
    "projets",
    "équipes",
    "Madagascar",
    "Ndao Hifanosika",
  ],

  authors: [
    {
      name: "Ndao Hifanosika",
    },
  ],

  creator: "Ndao Hifanosika",

  // PWA : installable + mode hors ligne (public/manifest.webmanifest, public/sw.js)
  manifest: "/manifest.webmanifest",

  // Favicon + icône Apple : on utilise le logo existant dans public/logos/
  icons: {
    icon: "/logos/ndao-hifanosika.png",
    apple: "/logos/ndao-hifanosika.png",
  },

  openGraph: {
    title: "Ndao Hifanosika - Plateforme de Suivi & Évaluation",
    description:
      "Plateforme intégrée de suivi et évaluation des projets, équipes et bénéficiaires",
    type: "website",
    locale: "fr_FR",
  },
};

// themeColor doit être dans `viewport` (Next.js 14+), plus dans `metadata`
export const viewport: Viewport = {
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <SettingsProvider>
          <I18nProvider>
            <AutoTranslate />
            {/* Monté à la racine : la mission GPS continue quand on change de page */}
            <MissionProvider>{children}</MissionProvider>
          </I18nProvider>
        </SettingsProvider>
        <OfflineSupport />
      </body>
    </html>
  );
}
