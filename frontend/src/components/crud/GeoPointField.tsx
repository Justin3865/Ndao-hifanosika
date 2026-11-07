"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { GoogleMap, MAPS_ENABLED, MapMarker } from "@/components/maps/GoogleMap";

/**
 * Position exacte d'une zone (ex. le siège de l'ONG) : on clique sur le bâtiment, sur la carte satellite,
 * ou on utilise la position GPS de l'appareil. Remplit « latitude » et « longitude » du formulaire.
 * À utiliser APRÈS le choix de la zone administrative (qui, elle, propose le centre de la commune).
 */
export function GeoPointField({
  values,
  setMany,
}: {
  values: Record<string, unknown>;
  setMany: (patch: Record<string, string>) => void;
}) {
  const [message, setMessage] = useState("");

  const rawLat = String(values.latitude ?? "").trim();
  const rawLng = String(values.longitude ?? "").trim();
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  const has = rawLat !== "" && rawLng !== "" && Number.isFinite(lat) && Number.isFinite(lng);

  const place = (latitude: number, longitude: number) => setMany({ latitude: latitude.toFixed(6), longitude: longitude.toFixed(6) });

  const markers: MapMarker[] = has
    ? [{ id: "point", latitude: lat, longitude: lng, title: "Position choisie", color: "#2563eb", radius: 10 }]
    : [];

  const useGps = () => {
    if (!navigator.geolocation) {
      setMessage("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }

    setMessage("Recherche de la position...");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        place(pos.coords.latitude, pos.coords.longitude);
        const accuracy = Math.round(pos.coords.accuracy);
        setMessage(
          accuracy > 30
            ? `Précision ≈ ${accuracy} m : insuffisante pour un bâtiment. Cliquez plutôt sur le toit du bâtiment sur la carte.`
            : `Position relevée (précision ≈ ${accuracy} m).`,
        );
      },
      () => setMessage("Position GPS refusée ou indisponible : cliquez sur la carte."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-700">Position exacte — cliquez sur le bâtiment (vue satellite)</p>
        <button
          type="button"
          onClick={useGps}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          <LocateFixed className="h-4 w-4" /> Utiliser ma position GPS
        </button>
      </div>

      {MAPS_ENABLED ? (
        <GoogleMap markers={markers} height={340} onMapClick={(latitude, longitude) => { place(latitude, longitude); setMessage(""); }} />
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Carte indisponible (clé Google Maps absente) : saisissez la latitude et la longitude à la main.
        </p>
      )}

      <p className="text-xs text-gray-500">
        {has ? `Latitude ${lat.toFixed(6)} · Longitude ${lng.toFixed(6)}` : "Aucune position choisie."}
        {message ? ` — ${message}` : ""}
      </p>
    </div>
  );
}
