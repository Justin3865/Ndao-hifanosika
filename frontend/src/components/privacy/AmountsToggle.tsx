"use client";

import { Eye, EyeOff } from "lucide-react";
import { toggleAmounts } from "@/lib/privacy";
import { useAmountsHidden } from "./useAmountsHidden";

/** Bouton « œil » : affiche ou masque tous les montants (Ar) de la plateforme. */
export function AmountsToggle({ className = "" }: { className?: string }) {
  const hidden = useAmountsHidden();
  const label = hidden ? "Afficher les montants" : "Masquer les montants";

  return (
    <button
      type="button"
      onClick={toggleAmounts}
      title={label}
      aria-label={label}
      aria-pressed={!hidden}
      className={`rounded-xl p-2.5 text-gray-600 transition hover:bg-gray-100 ${className}`}
    >
      {hidden ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </button>
  );
}

/** Petit « œil » à placer juste à côté d'un montant : clic = masquer / afficher (comme un champ mot de passe). */
export function AmountEye({ className = "" }: { className?: string }) {
  const hidden = useAmountsHidden();
  const label = hidden ? "Afficher les montants" : "Masquer les montants";

  return (
    <button
      type="button"
      onClick={toggleAmounts}
      title={label}
      aria-label={label}
      aria-pressed={!hidden}
      className={`ml-2 inline-flex items-center rounded-md p-1 align-middle text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 ${className}`}
    >
      {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}
