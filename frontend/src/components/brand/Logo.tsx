"use client";

import { useState } from "react";

interface LogoProps {
  size?: number;
  withText?: boolean;
  light?: boolean;
  /** Feuille blanche (PDF, certificat, rapport) : couleurs fixes, jamais modifiées par le mode sombre. */
  print?: boolean;
}

/**
 * Logo de l'ONG avec repli textuel.
 * - Écran (sidebar, en-têtes) : logo complet recadré (public/logos/logo-full.png), qui contient déjà
 *   le nom « ndao hifanosika ». Affiché en rond (rounded-full) à l'écran.
 * - Impression (print) : logo complet d'origine (public/logos/ndao-hifanosika.png), inchangé.
 */
export function Logo({ size = 40, withText = true, light = false, print = false }: LogoProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex items-center gap-3">
      {failed ? (
        <div
          className="flex items-center justify-center rounded-xl bg-amber-400 font-bold text-blue-950"
          style={{ width: size, height: size, fontSize: size * 0.38 }}
        >
          NH
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={print ? "/logos/ndao-hifanosika.png" : "/logos/logo-full.png"}
          alt="Ndao Hifanosika"
          width={size}
          height={size}
          onError={() => setFailed(true)}
          className={print ? "rounded-xl object-contain p-1" : "rounded-full object-contain p-1.5"}
          style={
            print
              ? {
                  width: size,
                  height: size,
                  backgroundColor: "#ffffff",
                  border: "2px solid #0F6BA0",
                  boxSizing: "border-box",
                }
              : {
                  width: size,
                  height: size,
                  // Fond blanc fixe : le logo reste lisible en mode clair ET sombre
                  backgroundColor: "#ffffff",
                  boxSizing: "border-box",
                }
          }
        />
      )}

      {withText && (
        <div className="leading-tight">
          {print ? (
            <>
              <p className="font-bold" style={{ color: "#0A4A70" }}>Ndao Hifanosika</p>
              <p className="text-xs" style={{ color: "#4b5563" }}>Suivi &amp; Évaluation</p>
            </>
          ) : (
            <>
              <p className={`font-bold ${light ? "text-white" : "text-blue-900"}`}>Ndao Hifanosika</p>
              <p className={`text-xs ${light ? "text-blue-200" : "text-gray-500"}`}>Suivi &amp; Évaluation</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
