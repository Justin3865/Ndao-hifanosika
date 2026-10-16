"use client";

import { useState } from "react";

interface LogoProps {
  size?: number;
  withText?: boolean;
  light?: boolean;
}

/** Logo de l'ONG (public/logos/ndao-hifanosika.png) avec repli textuel. */
export function Logo({ size = 40, withText = true, light = false }: LogoProps) {
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
          src="/logos/ndao-hifanosika.png"
          alt="Ndao Hifanosika"
          width={size}
          height={size}
          onError={() => setFailed(true)}
          className="rounded-xl bg-white object-contain p-1"
          style={{ width: size, height: size }}
        />
      )}

      {withText && (
        <div className="leading-tight">
          <p className={`font-bold ${light ? "text-white" : "text-blue-900"}`}>
            Ndao Hifanosika
          </p>
          <p className={`text-xs ${light ? "text-blue-200" : "text-gray-500"}`}>
            Suivi &amp; Évaluation
          </p>
        </div>
      )}
    </div>
  );
}
