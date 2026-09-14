
import type { Metadata } from "next";

import "./globals.css";
import { SettingsProvider } from "@/components/providers/settings-provider";

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

  openGraph: {
    title: "Ndao Hifanosika - Plateforme de Suivi & Évaluation",
    description:
      "Plateforme intégrée de suivi et évaluation des projets, équipes et bénéficiaires",
    type: "website",
    locale: "fr_FR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <link
          rel="icon"
          href="/favicon.ico"
          sizes="any"
        />

        <link
          rel="apple-touch-icon"
          href="/apple-touch-icon.png"
        />

        <meta
          name="theme-color"
          content="#7c3aed"
        />
      </head>

      <body className="min-h-screen bg-background text-foreground antialiased">
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}
