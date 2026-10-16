"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { CheckCircle2, Loader2, MapPin, ShieldCheck, StopCircle } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { API_URL, SOCKET_URL } from "@/lib/socket";

interface Info {
  firstName: string;
  isMinor: boolean;
  projectName: string | null;
  sharing: boolean;
}

type Phase = "loading" | "invalid" | "consent" | "idle" | "sharing" | "stopped";

/**
 * Page publique (sans compte) : le bénéficiaire, ou son parent/tuteur,
 * choisit lui-même de partager sa position et peut arrêter à tout moment.
 */
export default function SharePositionPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [info, setInfo] = useState<Info | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [accepted, setAccepted] = useState(false);
  const [guardian, setGuardian] = useState(false);
  const [error, setError] = useState("");
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const watchRef = useRef<number | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/public/tracking/${token}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("invalid");
        const json = await res.json();
        setInfo(json.data);
        setPhase(json.data.sharing ? "idle" : "consent");
      })
      .catch(() => setPhase("invalid"));
  }, [token]);

  const stopWatching = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  useEffect(() => stopWatching, [stopWatching]);

  const sendPosition = useCallback(
    (latitude: number, longitude: number, acc?: number) => {
      const payload = { latitude, longitude, accuracy: acc };

      const socket = socketRef.current;

      if (socket?.connected) {
        socket.emit("location", payload, (result: { ok: boolean; reason?: string }) => {
          if (result?.ok) setLastSent(new Date());
        });
        return;
      }

      // Repli HTTP si le WebSocket n'est pas disponible
      fetch(`${API_URL}/public/tracking/${token}/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((res) => {
          if (res.ok) setLastSent(new Date());
        })
        .catch(() => undefined);
    },
    [token]
  );

  const startWatching = useCallback(() => {
    setError("");

    if (!("geolocation" in navigator)) {
      setError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }

    socketRef.current = io(`${SOCKET_URL}/field`, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    watchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setAccuracy(Math.round(position.coords.accuracy));
        sendPosition(position.coords.latitude, position.coords.longitude, position.coords.accuracy);
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Autorisation refusée : activez la localisation dans les réglages du navigateur."
            : "Position indisponible pour le moment."
        );
        stopWatching();
        setPhase("idle");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );

    setPhase("sharing");
  }, [sendPosition, stopWatching, token]);

  const consent = async () => {
    setError("");

    const res = await fetch(`${API_URL}/public/tracking/${token}/consent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guardianConfirmed: guardian }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.message || "Impossible d'enregistrer votre accord.");
      return;
    }

    startWatching();
  };

  const stop = async () => {
    stopWatching();

    await fetch(`${API_URL}/public/tracking/${token}/stop`, { method: "POST" }).catch(() => undefined);

    setPhase("stopped");
  };

  const canStart = accepted && (!info?.isMinor || guardian);

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-blue-950 via-blue-900 to-blue-700 px-4 py-10">
      <div className="mb-8">
        <Logo light size={48} />
      </div>

      <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
        {phase === "loading" && (
          <div className="flex justify-center py-10 text-blue-700">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {phase === "invalid" && (
          <div className="py-6 text-center">
            <h1 className="text-xl font-bold text-gray-900">Lien invalide</h1>
            <p className="mt-2 text-sm text-gray-600">
              Ce lien n&apos;existe plus ou a été révoqué. Contactez l&apos;équipe Ndao Hifanosika.
            </p>
          </div>
        )}

        {phase === "consent" && info && (
          <div className="space-y-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <MapPin className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bonjour {info.firstName} 👋</h1>
              <p className="mt-2 text-sm text-gray-600">
                L&apos;équipe de Ndao Hifanosika{info.projectName ? ` (projet « ${info.projectName} »)` : ""} vous
                propose de partager votre position pour mieux vous accompagner sur le terrain.
              </p>
            </div>

            <ul className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm text-gray-700">
              <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /> Vous décidez : rien n&apos;est partagé sans votre accord.</li>
              <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /> Vous pouvez arrêter à tout moment avec un bouton.</li>
              <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /> Seule votre dernière position est conservée, puis effacée à l&apos;arrêt.</li>
            </ul>

            <label className="flex items-start gap-3 text-sm text-gray-800">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 h-5 w-5" />
              J&apos;accepte de partager ma position avec Ndao Hifanosika.
            </label>

            {info.isMinor && (
              <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                <input type="checkbox" checked={guardian} onChange={(e) => setGuardian(e.target.checked)} className="mt-1 h-5 w-5" />
                Je suis le parent ou le tuteur légal et j&apos;autorise ce partage pour cet enfant.
              </label>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="button"
              disabled={!canStart}
              onClick={consent}
              className="w-full rounded-xl bg-gradient-to-r from-blue-800 to-blue-600 py-3.5 font-semibold text-white shadow-lg transition disabled:opacity-40"
            >
              Commencer le partage
            </button>
          </div>
        )}

        {phase === "idle" && (
          <div className="space-y-5 text-center">
            <h1 className="text-xl font-bold text-gray-900">Partage en pause</h1>
            <p className="text-sm text-gray-600">Appuyez pour reprendre le partage de votre position.</p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="button" onClick={startWatching} className="w-full rounded-xl bg-blue-700 py-3.5 font-semibold text-white">
              Reprendre le partage
            </button>
            <button type="button" onClick={stop} className="w-full rounded-xl border border-red-200 py-3 text-sm font-medium text-red-600">
              Arrêter définitivement et effacer ma position
            </button>
          </div>
        )}

        {phase === "sharing" && (
          <div className="space-y-6 text-center">
            <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-40" />
              <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-500 text-white">
                <MapPin className="h-9 w-9" />
              </span>
            </div>

            <div>
              <h1 className="text-xl font-bold text-gray-900">Partage de position actif</h1>
              <p className="mt-1 text-sm text-gray-600">
                {lastSent ? `Dernier envoi : ${lastSent.toLocaleTimeString("fr-FR")}` : "Recherche de votre position..."}
                {accuracy !== null && ` · précision ≈ ${accuracy} m`}
              </p>
              <p className="mt-3 text-xs text-gray-500">Gardez cette page ouverte pour que le partage continue.</p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="button"
              onClick={stop}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 font-semibold text-white shadow-lg hover:bg-red-700"
            >
              <StopCircle className="h-5 w-5" /> Arrêter le partage
            </button>
          </div>
        )}

        {phase === "stopped" && (
          <div className="space-y-3 py-4 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
            <h1 className="text-xl font-bold text-gray-900">Partage arrêté</h1>
            <p className="text-sm text-gray-600">Votre position a été effacée. Merci !</p>
          </div>
        )}
      </div>

      <p className="mt-8 text-xs text-blue-200">© Ndao Hifanosika</p>
    </main>
  );
}
