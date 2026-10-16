"use client";

import { useEffect, useState } from "react";
import { Copy, Link2, MapPin, ShieldCheck, Trash2 } from "lucide-react";
import api from "@/lib/axios";
import { getStoredRole } from "@/lib/access";
import { errorMessage, fmtDateTime } from "@/lib/crud";

interface State {
  hasLink: boolean;
  path: string | null;
  trackingEnabled: boolean;
  lastSeenAt: string | null;
  age: number | null;
}

/** Panneau de gestion du suivi GPS (fiche bénéficiaire). */
export function TrackingPanel({ beneficiaryId }: { beneficiaryId: number }) {
  const [state, setState] = useState<State | null>(null);
  const [hidden, setHidden] = useState(false);
  const [role, setRole] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const load = () =>
    api
      .get(`/tracking/beneficiaries/${beneficiaryId}`)
      .then((res) => setState(res.data?.data ?? null))
      .catch(() => setHidden(true)); // rôle sans accès : on masque le panneau

  useEffect(() => {
    setRole(getStoredRole());
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beneficiaryId]);

  if (hidden || !state) return null;

  const canManage = ["ADMIN", "COORDINATOR"].includes(role);
  const fullUrl = state.path ? `${window.location.origin}${state.path}` : "";

  const generate = async () => {
    setError("");

    if (state.hasLink && !window.confirm("Un nouveau lien invalidera l'ancien et effacera la position actuelle. Continuer ?")) {
      return;
    }

    try {
      await api.post(`/tracking/beneficiaries/${beneficiaryId}/link`);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Génération impossible."));
    }
  };

  const revoke = async () => {
    if (!window.confirm("Révoquer le suivi et effacer la position de ce bénéficiaire ?")) return;

    try {
      await api.delete(`/tracking/beneficiaries/${beneficiaryId}`);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Révocation impossible."));
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-xl bg-blue-700 p-2.5 text-white">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Suivi terrain (GPS)</h3>
          <p className="text-xs text-gray-500">
            {state.trackingEnabled
              ? `Partage actif — dernière position : ${fmtDateTime(state.lastSeenAt)}`
              : state.hasLink
                ? "Lien généré — en attente du consentement du bénéficiaire"
                : "Aucun suivi configuré"}
          </p>
        </div>
      </div>

      <div className="mb-4 flex gap-2 rounded-xl bg-white p-3 text-xs text-gray-600 ring-1 ring-gray-100">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
        <p>
          La position n&apos;est partagée que si le bénéficiaire (ou son parent/tuteur s&apos;il est mineur)
          l&apos;accepte lui-même via ce lien. Il peut arrêter à tout moment ; seule la dernière position est conservée.
          {state.age !== null && state.age < 18 && (
            <strong className="text-amber-700"> Bénéficiaire mineur : l&apos;accord du parent/tuteur sera exigé.</strong>
          )}
        </p>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {fullUrl && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2">
          <input readOnly value={fullUrl} className="min-w-0 flex-1 bg-transparent px-2 text-xs text-gray-700 outline-none" />
          <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800">
            <Copy className="h-3.5 w-3.5" /> {copied ? "Copié !" : "Copier"}
          </button>
        </div>
      )}

      {canManage && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={generate} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800">
            <Link2 className="h-4 w-4" /> {state.hasLink ? "Régénérer le lien" : "Générer le lien de suivi"}
          </button>

          {state.hasLink && (
            <button type="button" onClick={revoke} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
              <Trash2 className="h-4 w-4" /> Révoquer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
