"use client";

import { useMemo, useRef, useState } from "react";
import { Crosshair, Mountain } from "lucide-react";
import { GoogleMap, MAPS_ENABLED, MapMarker } from "@/components/maps/GoogleMap"; // <-- Esory ny fetchElevation
import { toast } from "@/lib/toast";
import api from "@/services/api"; // <-- Ampidiro ny api axios anao

export interface GeoValue {
  latitude: string;
  longitude: string;
  altitude: string;
}

const input =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

/** Sélecteur de position : clic sur la carte, GPS de l'appareil ou saisie, avec altitude. */
export function GeoPicker({
  value,
  onChange,
  withAltitude = true,
}: {
  value: GeoValue;
  onChange: (value: GeoValue) => void;
  withAltitude?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  const lat = Number(value.latitude);
  const lng = Number(value.longitude);
  const hasPoint = value.latitude !== "" && value.longitude !== "" && Number.isFinite(lat) && Number.isFinite(lng);

  const markers: MapMarker[] = useMemo(
    () => (hasPoint ? [{ id: "pick", latitude: lat, longitude: lng, title: "Position choisie", color: "#dc2626", radius: 11 }] : []),
    [hasPoint, lat, lng]
  );

  /** Dernière raison d'échec du calcul d'altitude (affichée à l'utilisateur) */
  const elevationError = useRef("");

  /**
   * Altitude via le backend (GET /api/elevation).
   * ⚠️ « @/services/api » renvoie directement le corps JSON ({ success, data }), contrairement à un
   * axios classique ({ data: { success, data } }). On accepte les deux formes.
   */
  const fetchElevationFromBackend = async (latitude: number, longitude: number): Promise<number | null> => {
    elevationError.current = "";

    try {
      const response: any = await api.get("/elevation", { params: { lat: latitude, lng: longitude } });
      const body = response && "success" in response ? response : response?.data;
      const value = body?.data?.elevation;

      if (body?.success && typeof value === "number" && Number.isFinite(value)) {
        return value;
      }

      elevationError.current = body?.message || "Réponse inattendue du serveur.";
      return null;
    } catch (error: any) {
      console.error("Erreur récupération altitude", error);

      const status = error?.response?.status ?? error?.status;
      elevationError.current =
        status === 401
          ? "Session expirée : reconnectez-vous puis réessayez."
          : status === 404
          ? "Route /api/elevation introuvable : redémarrez le backend."
          : error?.response?.data?.message ||
            error?.message ||
            (error?.code === "ERR_NETWORK" || !status
              ? "Backend injoignable : vérifiez qu'il est démarré."
              : "Altitude indisponible pour le moment.");

      return null;
    }
  };

  const setPoint = async (latitude: number, longitude: number, altitude?: number | null) => {
    const next: GeoValue = {
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
      altitude: altitude !== undefined && altitude !== null ? String(Math.round(altitude)) : value.altitude,
    };
    onChange(next);

    if (withAltitude && (altitude === undefined || altitude === null)) {
      // ▼▼▼ NOVOAKO : Miantso ny backend fa tsy an'i Google ▼▼▼
      const elevation = await fetchElevationFromBackend(latitude, longitude);
      if (elevation !== null) onChange({ ...next, altitude: String(elevation) });
    }
  };

  const useMyPosition = () => {
    if (!("geolocation" in navigator)) {
      toast.error("La géolocalisation n'est pas disponible.");
      return;
    }

    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void setPoint(pos.coords.latitude, pos.coords.longitude, pos.coords.altitude);
        setBusy(false);
      },
      () => {
        toast.error("Position refusée ou indisponible.");
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const computeAltitude = async () => {
    if (!hasPoint) return;
    setBusy(true);
    
    // ▼▼▼ NOVOAKO : Miantso ny backend fa tsy an'i Google ▼▼▼
    const elevation = await fetchElevationFromBackend(lat, lng);
    setBusy(false);

    if (elevation === null) {
      toast.warning(`${elevationError.current || "Altitude indisponible pour le moment."} Vous pouvez aussi la saisir manuellement.`);
    } else {
      onChange({ ...value, altitude: String(elevation) });
    }
  };

  return (
    <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
      {MAPS_ENABLED && (
        <GoogleMap markers={markers} height={260} onMapClick={(a, b) => void setPoint(a, b)} refit />
      )}

      <div className={`grid gap-3 ${withAltitude ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <label className="text-xs font-medium text-gray-600">
          Latitude
          <input className={input} value={value.latitude} onChange={(e) => onChange({ ...value, latitude: e.target.value })} placeholder="-21.453600" />
        </label>
        <label className="text-xs font-medium text-gray-600">
          Longitude
          <input className={input} value={value.longitude} onChange={(e) => onChange({ ...value, longitude: e.target.value })} placeholder="47.085700" />
        </label>
        {withAltitude && (
          <label className="text-xs font-medium text-gray-600">
            Altitude (m)
            <input className={input} value={value.altitude} onChange={(e) => onChange({ ...value, altitude: e.target.value })} placeholder="1100" />
          </label>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={useMyPosition} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-60">
          <Crosshair className="h-4 w-4" /> Ma position actuelle
        </button>
        {withAltitude && (
          <button type="button" onClick={computeAltitude} disabled={busy || !hasPoint} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50">
            <Mountain className="h-4 w-4" /> Calculer l&apos;altitude
          </button>
        )}
        {MAPS_ENABLED && <span className="self-center text-xs text-gray-500">Cliquez sur la carte pour placer le point.</span>}
      </div>
    </div>
  );
}