"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, UserCheck, UserX, XCircle } from "lucide-react";
import { getStoredRole } from "@/lib/access";
import { ApiUser, activateUser, apiErrorMessage, fetchUsers, rejectUser } from "@/lib/usersApi";
import { roleLabel } from "@/lib/roles";
import { confirmDialog, toast } from "@/lib/toast";

/** Notification créée à chaque inscription (voir eventNotifier.middleware côté backend). */
export const REGISTRATION_TITLE = "nouvelle demande d'inscription";

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export const isRegistrationRequest = (item: { title: string }): boolean =>
  normalize(item.title).startsWith(REGISTRATION_TITLE);

/** « VICTORIA FENOHANITRA (adresse@mail.com) attend votre validation. » → adresse@mail.com */
export const emailFromMessage = (message: string): string | null =>
  message.match(/\(([^()\s]+@[^()\s]+)\)/)?.[1]?.toLowerCase() ?? null;

// Une seule lecture de la liste des utilisateurs pour toutes les cartes affichées
let cache: { at: number; promise: Promise<ApiUser[]> } | null = null;

function loadUsers(force = false): Promise<ApiUser[]> {
  if (!force && cache && Date.now() - cache.at < 8000) return cache.promise;

  const promise = fetchUsers();
  cache = { at: Date.now(), promise };
  promise.catch(() => {
    cache = null;
  });

  return promise;
}

type Props = {
  item: { title: string; message: string };
  /** true = affichage détaillé (fenêtre de détail) */
  detailed?: boolean;
  onDone?: () => void;
};

/**
 * Boutons « Accepter / Refuser / Voir le profil » d'une demande d'inscription.
 * Réservé à l'ADMIN (comme les routes /users/:id/activate et /users/:id/reject).
 */
export function RegistrationRequestActions({ item, detailed = false, onDone }: Props) {
  const [role, setRole] = useState("");
  const [user, setUser] = useState<ApiUser | null | undefined>(undefined); // undefined = chargement
  const [busy, setBusy] = useState("");

  const email = emailFromMessage(item.message);

  const refresh = useCallback(
    async (force = false) => {
      if (!email) return setUser(null);

      try {
        const users = await loadUsers(force);
        setUser(users.find((candidate) => candidate.email.toLowerCase() === email) ?? null);
      } catch {
        setUser(null);
      }
    },
    [email],
  );

  useEffect(() => {
    setRole(getStoredRole());
  }, []);

  useEffect(() => {
    if (role === "ADMIN") void refresh();
  }, [role, refresh]);

  if (role !== "ADMIN" || !isRegistrationRequest(item)) return null;

  const decide = async (action: "accept" | "reject") => {
    if (!user) return;

    if (
      action === "reject" &&
      !(await confirmDialog(`Refuser l'inscription de ${user.firstName} ${user.lastName} ?`, {
        title: "Refuser l'inscription",
        confirmLabel: "Refuser",
      }))
    ) {
      return;
    }

    setBusy(action);

    try {
      if (action === "accept") await activateUser(user.id);
      else await rejectUser(user.id);

      toast.success(action === "accept" ? "Inscription acceptée : le compte est activé." : "Inscription refusée.");
      await refresh(true);
      onDone?.();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Action impossible."));
    } finally {
      setBusy("");
    }
  };

  const button = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-60";

  return (
    <div className="mt-3 space-y-3 border-t border-gray-200 pt-3" data-no-press onClick={(event) => event.stopPropagation()}>
      {user === undefined && (
        <p className="inline-flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Recherche de la demande…
        </p>
      )}

      {user === null && (
        <p className="text-sm text-gray-500">Cette demande n&apos;a pas été retrouvée (compte supprimé ou adresse e-mail modifiée).</p>
      )}

      {user && detailed && (
        <dl className="grid gap-x-6 gap-y-1 rounded-xl bg-gray-50 p-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">Nom</dt>
            <dd className="font-medium text-gray-900">
              {user.firstName} {user.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">E-mail</dt>
            <dd className="break-all font-medium text-gray-900">{user.email}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Téléphone</dt>
            <dd className="font-medium text-gray-900">{user.phone || "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Rôle demandé</dt>
            <dd className="font-medium text-gray-900">{roleLabel(user.role)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Département</dt>
            <dd className="font-medium text-gray-900">{user.department?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Demande du</dt>
            <dd className="font-medium text-gray-900">{new Date(user.createdAt).toLocaleString("fr-FR")}</dd>
          </div>
        </dl>
      )}

      {user?.status === "PENDING" && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy !== ""} onClick={() => decide("accept")} className={`${button} bg-green-600 text-white hover:bg-green-700`}>
            <UserCheck className="h-4 w-4" /> {busy === "accept" ? "Activation…" : "Accepter"}
          </button>
          <button type="button" disabled={busy !== ""} onClick={() => decide("reject")} className={`${button} border border-red-300 bg-white text-red-600 hover:bg-red-50`}>
            <UserX className="h-4 w-4" /> {busy === "reject" ? "Refus…" : "Refuser"}
          </button>
          <Link href={`/users/${user.id}`} className={`${button} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}>
            <ExternalLink className="h-4 w-4" /> Voir la demande
          </Link>
        </div>
      )}

      {user && user.status !== "PENDING" && (
        <p className={`inline-flex items-center gap-2 text-sm font-medium ${user.status === "REJECTED" ? "text-red-600" : "text-green-700"}`}>
          {user.status === "REJECTED" ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          {user.status === "REJECTED" ? "Demande déjà refusée." : "Demande déjà acceptée : le compte est actif."}
          <Link href={`/users/${user.id}`} className="ml-2 font-normal text-blue-700 underline">
            Voir le profil
          </Link>
        </p>
      )}
    </div>
  );
}
