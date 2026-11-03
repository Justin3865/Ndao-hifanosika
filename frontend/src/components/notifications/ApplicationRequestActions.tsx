"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, UserCheck, UserX, XCircle } from "lucide-react";
import { getStoredRole } from "@/lib/access";
import { apiRequest } from "@/lib/stages";
import { confirmDialog, toast } from "@/lib/toast";

/** Notification créée à chaque dossier de candidature (voir eventNotifier.middleware côté backend). */
export const APPLICATION_TITLE = "nouveau dossier de candidature";

// ⚠️ Mêmes rôles que OFFER_MANAGER_ROLES (backend/src/routes/internshipOffers.routes.ts)
const MANAGER_ROLES = ["ADMIN", "RH", "COORDINATOR"];

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export const isApplicationRequest = (item: { title: string }): boolean =>
  normalize(item.title).startsWith(APPLICATION_TITLE);

/** « … (n° abcd1234-efgh5678-ijkl9012). » → abcd1234-efgh5678-ijkl9012 (ancien format) ou 4 blocs (nouveau) */
export const dossierFromMessage = (message: string): string | null =>
  message.match(/n°\s*([a-z0-9]{8}(?:-[a-z0-9]{8}){2,3})/i)?.[1]?.toLowerCase() ?? null;

type Status = "PENDING" | "ACCEPTED" | "REJECTED";

type Found = {
  id: number;
  status: Status;
  applicantName?: string | null;
  offer: { id: number; title: string };
};

type Props = {
  item: { title: string; message: string };
  /** true = affichage détaillé (fenêtre de détail) */
  detailed?: boolean;
  onDone?: () => void;
};

/** Boutons « Accepter / Refuser / Voir le dossier » d'un dossier de candidature. */
export function ApplicationRequestActions({ item, detailed = false, onDone }: Props) {
  const [role, setRole] = useState("");
  const [app, setApp] = useState<Found | null | undefined>(undefined); // undefined = chargement
  const [busy, setBusy] = useState("");

  const dossier = dossierFromMessage(item.message);

  const refresh = useCallback(async () => {
    if (!dossier) return setApp(null);
    try {
      const res = await apiRequest(`/internship-offers/applications/lookup?dossier=${encodeURIComponent(dossier)}`);
      setApp((res.data ?? res) as Found);
    } catch {
      setApp(null);
    }
  }, [dossier]);

  useEffect(() => {
    setRole(getStoredRole());
  }, []);

  useEffect(() => {
    if (MANAGER_ROLES.includes(role) && isApplicationRequest(item)) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, refresh]);

  if (!MANAGER_ROLES.includes(role) || !isApplicationRequest(item)) return null;

  const decide = async (status: "ACCEPTED" | "REJECTED") => {
    if (!app) return;

    if (
      status === "REJECTED" &&
      !(await confirmDialog(`Refuser le dossier de ${app.applicantName || "ce candidat"} ?`, {
        title: "Refuser le dossier",
        confirmLabel: "Refuser",
      }))
    ) {
      return;
    }

    setBusy(status);
    try {
      await apiRequest(`/internship-offers/applications/${app.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast.success(status === "ACCEPTED" ? "Dossier accepté." : "Dossier refusé.");
      setApp({ ...app, status });
      onDone?.();
    } catch (error: any) {
      toast.error(error?.message || "Action impossible.");
    } finally {
      setBusy("");
    }
  };

  const button = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-60";
  const viewLink = app ? `/stages/${app.offer.id}/candidatures` : "/stages";

  return (
    <div className="mt-3 space-y-3 border-t border-gray-200 pt-3" data-no-press onClick={(event) => event.stopPropagation()}>
      {app === undefined && (
        <p className="inline-flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Recherche du dossier…
        </p>
      )}

      {app === null && <p className="text-sm text-gray-500">Ce dossier n&apos;a pas été retrouvé (candidature supprimée ?).</p>}

      {app && detailed && (
        <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
          Stage : <span className="font-medium text-gray-900">{app.offer.title}</span>
        </p>
      )}

      {app && (
        <div className="flex flex-wrap items-center gap-2">
          {app.status === "PENDING" ? (
            <>
              <button type="button" disabled={busy !== ""} onClick={() => decide("ACCEPTED")} className={`${button} bg-green-600 text-white hover:bg-green-700`}>
                <UserCheck className="h-4 w-4" /> {busy === "ACCEPTED" ? "Acceptation…" : "Accepter"}
              </button>
              <button type="button" disabled={busy !== ""} onClick={() => decide("REJECTED")} className={`${button} border border-red-300 bg-white text-red-600 hover:bg-red-50`}>
                <UserX className="h-4 w-4" /> {busy === "REJECTED" ? "Refus…" : "Refuser"}
              </button>
            </>
          ) : (
            <p className={`inline-flex items-center gap-2 text-sm font-medium ${app.status === "REJECTED" ? "text-red-600" : "text-green-700"}`}>
              {app.status === "REJECTED" ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
              {app.status === "REJECTED" ? "Dossier déjà refusé." : "Dossier déjà accepté."}
            </p>
          )}
          <Link href={viewLink} className={`${button} border border-gray-300 bg-white text-gray-700 hover:bg-gray-50`}>
            <ExternalLink className="h-4 w-4" /> Voir le dossier
          </Link>
        </div>
      )}
    </div>
  );
}
