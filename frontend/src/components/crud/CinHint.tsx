"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { cinPrefixError, districtsOfPlace } from "@/lib/cin";

/**
 * Aide en direct sous un champ « N° CIN » :
 *  - rappelle le code du district attendu d'après le lieu de délivrance / de naissance
 *  - signale tout de suite un préfixe incohérent
 *  - vérifie (12 chiffres saisis) que le CIN n'est pas déjà enregistré pour une autre personne
 */
export function CinHint({
  cin,
  birthPlace,
  issuedPlace,
  userId,
  beneficiaryId,
}: {
  cin: string;
  birthPlace?: string;
  issuedPlace?: string;
  userId?: number;
  beneficiaryId?: number;
}) {
  const digits = String(cin ?? "").replace(/\D/g, "");
  const [remote, setRemote] = useState<{ state: "idle" | "checking" | "ok" | "error"; message: string }>({ state: "idle", message: "" });

  const localError = digits.length >= 3 ? cinPrefixError(digits, [issuedPlace, birthPlace]) : null;

  useEffect(() => {
    if (digits.length !== 12 || localError) {
      setRemote({ state: "idle", message: "" });
      return;
    }

    let cancelled = false;
    setRemote({ state: "checking", message: "" });

    const timer = setTimeout(() => {
      api
        .get("/profile/cin-check", { params: { cin: digits, userId, beneficiaryId, birthPlace, issuedPlace } })
        .then((res) => {
          if (cancelled) return;
          const d = res.data ?? {};

          if (d.taken) {
            setRemote({
              state: "error",
              message: d.holder ? `Ce N° CIN est déjà enregistré pour « ${d.holder} ».` : "Ce N° CIN est déjà enregistré pour une autre personne.",
            });
          } else if (d.prefixError) {
            setRemote({ state: "error", message: d.prefixError });
          } else {
            setRemote({ state: "ok", message: "N° CIN disponible." });
          }
        })
        .catch(() => {
          if (!cancelled) setRemote({ state: "idle", message: "" });
        });
    }, 450);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits, localError, userId, beneficiaryId, birthPlace, issuedPlace]);

  const expected = [...new Map([...districtsOfPlace(issuedPlace), ...districtsOfPlace(birthPlace)].map((d) => [d.code, d])).values()];

  if (localError) return <p className="mt-1 text-xs font-medium text-red-600">{localError}</p>;
  if (remote.state === "error") return <p className="mt-1 text-xs font-medium text-red-600">{remote.message}</p>;
  if (remote.state === "checking") return <p className="mt-1 text-xs text-gray-500">Vérification dans la base de données…</p>;
  if (remote.state === "ok") return <p className="mt-1 text-xs font-medium text-green-600">{remote.message}</p>;

  return (
    <p className="mt-1 text-xs text-gray-500">
      {expected.length > 0
        ? `Doit commencer par ${expected.map((d) => `${d.code} (${d.name})`).join(" ou ")}.`
        : "Les 3 premiers chiffres = code du district (ex. 203 Ambositra, 313 Ambatondrazaka)."}
    </p>
  );
}
