"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStoredRole, homePathFor } from "@/lib/access";

export default function ForbiddenPage() {
  const [role, setRole] = useState("");
  const [home, setHome] = useState("/dashboard");
  const [from, setFrom] = useState("");

  useEffect(() => {
    const current = getStoredRole();
    setRole(current);
    setHome(homePathFor(current));
    setFrom(new URLSearchParams(window.location.search).get("from") ?? "");
  }, []);

  const logout = () => {
    ["accessToken", "refreshToken", "user"].forEach((k) => localStorage.removeItem(k));
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-5xl font-bold text-gray-900">403</h1>
      <p className="text-gray-600">Vous n&apos;avez pas la permission d&apos;accéder à cette page.</p>
      {from && <p className="text-xs text-gray-400">Page demandée : <code>{from}</code></p>}
      {role ? (
        <p className="text-xs text-gray-400">Rôle connecté : {role}</p>
      ) : (
        <p className="text-xs text-amber-600">Session incomplète (rôle introuvable) : reconnectez-vous.</p>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {role && home !== "/login" && (
          <Link href={home} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
            {home === "/dashboard" ? "Retour au tableau de bord" : "Retour à mon espace"}
          </Link>
        )}
        <button type="button" onClick={logout} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Se reconnecter
        </button>
      </div>
    </div>
  );
}
