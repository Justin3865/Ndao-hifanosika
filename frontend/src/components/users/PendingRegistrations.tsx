"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, UserPlus, X } from "lucide-react";
import {
  ApiUser,
  activateUser,
  apiErrorMessage,
  fetchUsers,
  formatDateTime,
  fullName,
  rejectUser,
} from "@/lib/usersApi";
import { useToast } from "@/components/ui/ToastProvider";

/**
 * Demandes d'inscription en attente — réservé à l'ADMIN.
 * Accepter => compte ACTIF + notification à la personne ; Refuser => compte REJETÉ + e-mail/SMS.
 * Rafraîchi toutes les 20 s et après chaque action.
 */
export default function PendingRegistrations({ onChanged }: { onChanged?: () => void }) {
  const toast = useToast();
  const [pending, setPending] = useState<ApiUser[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const users = await fetchUsers();
      setPending(users.filter((u) => u.status === "PENDING"));
    } catch {
      /* silencieux : la page affiche déjà ses propres erreurs */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  async function decide(user: ApiUser, action: "accept" | "reject") {
    const name = fullName(user);
    const question =
      action === "accept" ? `Accepter l'inscription de ${name} ?` : `Refuser l'inscription de ${name} ?`;
    if (!window.confirm(question)) return;

    setBusyId(user.id);
    try {
      if (action === "accept") {
        await activateUser(user.id);
        toast.success(`${name} peut maintenant se connecter.`, "Inscription acceptée");
      } else {
        await rejectUser(user.id);
        toast.warning(`La demande de ${name} a été refusée.`, "Inscription refusée");
      }
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Action impossible."));
    } finally {
      setBusyId(null);
    }
  }

  if (pending.length === 0) return null;

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-amber-300 bg-amber-50 shadow-sm">
      <div className="flex items-center gap-3 border-b border-amber-200 px-5 py-3">
        <span className="rounded-xl bg-amber-200 p-2 text-amber-800">
          <UserPlus className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-bold text-amber-900">
            {pending.length} demande{pending.length > 1 ? "s" : ""} d&apos;inscription en attente
          </h3>
          <p className="text-xs text-amber-800">Acceptez ou refusez l&apos;accès à la plateforme.</p>
        </div>
      </div>

      <ul className="divide-y divide-amber-200">
        {pending.map((user) => (
          <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900">{fullName(user)}</p>
              <p className="truncate text-sm text-gray-600">
                {user.email}
                {user.phone ? ` · ${user.phone}` : ""}
                {user.department?.name ? ` · ${user.department.name}` : ""}
              </p>
              <p className="text-xs text-gray-500">Demande du {formatDateTime(user.createdAt)}</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={busyId === user.id}
                onClick={() => decide(user, "accept")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
              >
                {busyId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Accepter
              </button>
              <button
                type="button"
                disabled={busyId === user.id}
                onClick={() => decide(user, "reject")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
              >
                <X className="h-4 w-4" />
                Refuser
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
