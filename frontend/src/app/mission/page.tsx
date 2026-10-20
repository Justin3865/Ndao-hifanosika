"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Navigation, ShieldCheck, StopCircle } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { GoogleMap, MapLine, MapMarker } from "@/components/maps/GoogleMap";
import { getSocket } from "@/lib/socket";
import { toast } from "@/lib/toast";
import { scoreColor, useHouseholds } from "@/lib/useLiveTargets";
import { getStoredRole } from "@/lib/access";

interface Position {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
}

const FIELD_ROLES = ["ADMIN", "DIRECTION", "COORDINATOR"];

function km(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(bLat - aLat) / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(r(bLng - aLng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export default function MissionPage() {
  const [role, setRole] = useState("");
  const [sharing, setSharing] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const watchRef = useRef<number | null>(null);

  useEffect(() => setRole(getStoredRole()), []);

  const canSeeHouseholds = FIELD_ROLES.includes(role);
  const { households } = useHouseholds(canSeeHouseholds);

  const stop = useCallback((notify = true) => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }

    if (notify) getSocket()?.emit("mission:stop");
    setSharing(false);
  }, []);

  // La position n'est plus partagée dès qu'on quitte la page
  useEffect(() => () => stop(true), [stop]);

  const start = () => {
    setError("");

    const socket = getSocket();

    if (!socket) {
      setError("Connexion temps réel indisponible. Reconnectez-vous.");
      return;
    }

    if (!("geolocation" in navigator)) {
      setError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }

    socket.emit("mission:start");

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const next: Position = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          altitude: pos.coords.altitude,
          accuracy: Math.round(pos.coords.accuracy),
        };

        setPosition(next);

        socket.emit("mission:location", { latitude: next.latitude, longitude: next.longitude, altitude: next.altitude }, (r: { ok: boolean }) => {
          if (r?.ok) setLastSent(new Date());
        });
      },
      (err) => {
        setError(err.code === err.PERMISSION_DENIED ? "Autorisation refusée : activez la localisation du navigateur." : "Position indisponible.");
        stop(true);
      },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 20000 }
    );

    setSharing(true);
    toast.success("Mission démarrée : votre position est partagée avec la direction.");
  };

  const finish = () => {
    stop(true);
    toast.info("Mission terminée : votre position n'est plus partagée.");
  };

  const nearby = useMemo(() => {
    if (!position) return [];

    return households
      .filter((h) => h.latitude !== null && h.longitude !== null && (h.score >= 50 || h.vulnerable))
      .map((h) => ({ h, distance: km(position.latitude, position.longitude, h.latitude as number, h.longitude as number) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
  }, [position, households]);

  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = nearby.map(({ h, distance }) => ({
      id: `h-${h.id}`,
      latitude: h.latitude as number,
      longitude: h.longitude as number,
      title: h.name,
      color: scoreColor(h.score),
      radius: 10,
      info: `${h.locality ?? ""} — score ${h.score} — ${distance.toFixed(1)} km — altitude ${h.altitude ?? "?"} m`,
    }));

    if (position) {
      list.push({ id: "me", latitude: position.latitude, longitude: position.longitude, title: "Moi", color: "#1d4ed8", shape: "square", radius: 10 });
    }

    return list;
  }, [nearby, position]);

  const lines: MapLine[] = useMemo(
    () =>
      position && nearby[0]
        ? [{ id: "l", from: { latitude: position.latitude, longitude: position.longitude }, to: { latitude: nearby[0].h.latitude as number, longitude: nearby[0].h.longitude as number }, label: `${nearby[0].distance.toFixed(1)} km` }]
        : [],
    [position, nearby]
  );

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ma mission terrain</h1>
          <p className="text-sm text-gray-500">Partagez votre position GPS (avec altitude) pendant vos déplacements.</p>
        </div>

        <div className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            La position n&apos;est partagée que pendant la mission (bouton ci-dessous), visible uniquement de la direction et des coordinateurs, et arrêtée
            automatiquement quand vous quittez cette page ou vous déconnectez. Aucun historique de trajet n&apos;est conservé.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${sharing ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}>
            <Navigation className="h-7 w-7" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900">{sharing ? "Mission en cours — position partagée" : "Position non partagée"}</p>
            {position && (
              <p className="text-sm text-gray-500">
                {position.latitude.toFixed(5)}, {position.longitude.toFixed(5)} · altitude {position.altitude !== null ? `${Math.round(position.altitude)} m` : "non fournie"} · précision ≈ {position.accuracy} m
                {lastSent ? ` · envoi ${lastSent.toLocaleTimeString("fr-FR")}` : ""}
              </p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          {sharing ? (
            <button type="button" onClick={finish} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700">
              <StopCircle className="h-5 w-5" /> Terminer la mission
            </button>
          ) : (
            <button type="button" onClick={start} className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-5 py-3 font-semibold text-white hover:bg-blue-900">
              <MapPin className="h-5 w-5" /> Démarrer la mission
            </button>
          )}
        </div>

        {canSeeHouseholds && position && (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
              <GoogleMap markers={markers} lines={lines} height={420} refit />
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 font-semibold text-gray-900">Ménages prioritaires proches</h2>
              <div className="space-y-2">
                {nearby.length === 0 && <p className="text-sm text-gray-500">Aucun ménage géolocalisé à proximité.</p>}
                {nearby.map(({ h, distance }) => (
                  <div key={h.id} className="rounded-xl border border-gray-100 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">{h.name}</p>
                      <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: scoreColor(h.score) }}>{h.score}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {h.locality ?? h.zoneName ?? "—"} · {distance.toFixed(1)} km · altitude {h.altitude ?? "?"} m
                      {h.altitude !== null && position.altitude !== null ? ` (dénivelé ${Math.round(h.altitude - position.altitude)} m)` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}