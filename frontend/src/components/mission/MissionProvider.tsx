"use client";

import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import api from "@/lib/axios";
import { getSocket } from "@/lib/socket";
import { getStoredRole } from "@/lib/access";
import { toast } from "@/lib/toast";

/**
 * Mission terrain de l'agent.
 *
 * Ce fournisseur est monté UNE SEULE FOIS à la racine de l'application : la mission et le
 * suivi GPS continuent donc quand on change de menu/page. Elle ne s'arrête que lorsque
 * l'agent appuie sur « Terminer la mission » (l'état est conservé côté serveur : après un
 * rechargement ou une reconnexion, la mission en cours est reprise automatiquement).
 */

export interface MissionPosition {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  heading: number | null;
}

interface MissionContextValue {
  canMission: boolean;
  active: boolean;
  startedAt: string | null;
  position: MissionPosition | null;
  lastSent: Date | null;
  error: string;
  busy: boolean;
  start: () => Promise<void>;
  finish: () => Promise<void>;
}

const MISSION_ROLES = ["ADMIN", "DIRECTION", "DSI", "DAF", "RH", "COMMUNICATION", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2"];

const MissionContext = createContext<MissionContextValue | null>(null);

export function useMission(): MissionContextValue {
  const ctx = useContext(MissionContext);

  if (!ctx) {
    return {
      canMission: false, active: false, startedAt: null, position: null, lastSent: null, error: "", busy: false,
      start: async () => undefined, finish: async () => undefined,
    };
  }

  return ctx;
}

const SEND_EVERY_MS = 3000;
const HEARTBEAT_MS = 20000;

export function MissionProvider({ children }: { children: ReactNode }) {
  const [canMission, setCanMission] = useState(false);
  const [active, setActive] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [position, setPosition] = useState<MissionPosition | null>(null);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const watchRef = useRef<number | null>(null);
  const lastPosRef = useRef<MissionPosition | null>(null);
  const lastSendAtRef = useRef(0);
  const wakeRef = useRef<{ release: () => Promise<void> } | null>(null);
  const activeRef = useRef(false);
  activeRef.current = active;

  /* ------------------------- envoi de la position ------------------------- */

  const send = useCallback((pos: MissionPosition, force = false) => {
    const now = Date.now();
    if (!force && now - lastSendAtRef.current < SEND_EVERY_MS) return;
    lastSendAtRef.current = now;

    const payload = {
      latitude: pos.latitude,
      longitude: pos.longitude,
      altitude: pos.altitude,
      accuracy: pos.accuracy,
      heading: pos.heading,
    };

    const socket = getSocket();

    if (socket?.connected) {
      socket.emit("mission:location", payload, (r: { ok: boolean }) => {
        if (r?.ok) setLastSent(new Date());
      });
      return;
    }

    // Repli HTTP si le WebSocket est coupé
    api
      .post("/tracking/my-mission/location", payload)
      .then(() => setLastSent(new Date()))
      .catch(() => undefined);
  }, []);

  /* ------------------------------ suivi GPS ------------------------------ */

  const stopWatch = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }

    void wakeRef.current?.release().catch(() => undefined);
    wakeRef.current = null;
  }, []);

  const requestWakeLock = useCallback(async () => {
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
      if (nav.wakeLock && !wakeRef.current) wakeRef.current = await nav.wakeLock.request("screen");
    } catch {
      /* facultatif */
    }
  }, []);

  const startWatch = useCallback(() => {
    if (watchRef.current !== null || !("geolocation" in navigator)) return;

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const next: MissionPosition = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          altitude: pos.coords.altitude,
          accuracy: Math.round(pos.coords.accuracy),
          heading: pos.coords.heading,
        };

        lastPosRef.current = next;
        setPosition(next);
        setError("");
        send(next);
      },
      (err) => {
        // La mission n'est PAS arrêtée : seul le bouton « Terminer » la termine.
        if (err.code === err.PERMISSION_DENIED) {
          setError("Localisation refusée : activez le GPS / la localisation du navigateur pour que la direction voie votre position.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError("Position indisponible : vérifiez que le GPS de l'appareil est activé.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 20000 }
    );

    void requestWakeLock();
  }, [requestWakeLock, send]);

  /* --------------------------- reprise au chargement --------------------------- */

  useEffect(() => {
    const role = getStoredRole();
    const allowed = MISSION_ROLES.includes(role);
    setCanMission(allowed);

    if (!allowed || !localStorage.getItem("accessToken")) return;

    getSocket(); // connexion temps réel => agent « en ligne » pour l'administration

    api
      .get("/tracking/my-mission")
      .then((res) => {
        const data = res.data?.data;
        if (data?.active) {
          setActive(true);
          setStartedAt(data.startedAt ?? null);
          startWatch();
        }
      })
      .catch(() => undefined);

    // Synchronisation entre onglets / appareils + rappels du serveur
    const socket = getSocket();

    const onState = (s: { active: boolean; startedAt?: string }) => {
      setActive(s.active);
      setStartedAt(s.active ? s.startedAt ?? null : null);

      if (s.active) startWatch();
      else {
        stopWatch();
        setPosition(null);
      }
    };

    const onRemind = (r: { reason: string }) => {
      if (activeRef.current && r.reason === "no_gps") return;

      toast.info(
        r.reason === "signal_lost"
          ? "Signal GPS perdu : vérifiez que la localisation de votre appareil est activée."
          : "Votre GPS n'est pas activé : ouvrez « Ma mission (GPS) » et démarrez votre mission."
      );
    };

    socket?.on("mission:state", onState);
    socket?.on("mission:remind", onRemind);

    return () => {
      socket?.off("mission:state", onState);
      socket?.off("mission:remind", onRemind);
    };
  }, [startWatch, stopWatch]);

  // Signal régulier même à l'arrêt (le navigateur n'émet rien quand on ne bouge pas)
  useEffect(() => {
    if (!active) return;

    const timer = window.setInterval(() => {
      if (lastPosRef.current) send(lastPosRef.current, true);
    }, HEARTBEAT_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void requestWakeLock();
        if (lastPosRef.current) send(lastPosRef.current, true);
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, requestWakeLock, send]);

  // Fermeture complète de l'application : on libère seulement le GPS local
  // (la mission reste ouverte côté serveur jusqu'à « Terminer la mission »).
  useEffect(() => () => stopWatch(), [stopWatch]);

  /* ------------------------------- actions ------------------------------- */

  const start = useCallback(async () => {
    setError("");

    if (!("geolocation" in navigator)) {
      setError("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }

    setBusy(true);

    try {
      // On vérifie d'abord que le GPS est autorisé : pas de mission « fantôme » sans position
      const first = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 20000 })
      );

      const res = await api.post("/tracking/my-mission/start");
      setActive(true);
      setStartedAt(res.data?.data?.startedAt ?? new Date().toISOString());

      const pos: MissionPosition = {
        latitude: first.coords.latitude,
        longitude: first.coords.longitude,
        altitude: first.coords.altitude,
        accuracy: Math.round(first.coords.accuracy),
        heading: first.coords.heading,
      };

      lastPosRef.current = pos;
      setPosition(pos);
      send(pos, true);
      startWatch();
      toast.success("Mission démarrée : votre position est partagée avec la direction jusqu'à « Terminer la mission ».");
    } catch (err) {
      const geo = err as GeolocationPositionError;

      if (geo && typeof geo.code === "number") {
        setError(
          geo.code === geo.PERMISSION_DENIED
            ? "Autorisation refusée : activez la localisation de l'appareil et du navigateur, puis réessayez."
            : "Position GPS introuvable : sortez à l'air libre ou activez le GPS, puis réessayez."
        );
      } else {
        setError("Impossible de démarrer la mission (serveur injoignable). Réessayez.");
      }
    } finally {
      setBusy(false);
    }
  }, [send, startWatch]);

  const finish = useCallback(async () => {
    setBusy(true);

    try {
      await api.post("/tracking/my-mission/finish");
      stopWatch();
      lastPosRef.current = null;
      setActive(false);
      setStartedAt(null);
      setPosition(null);
      setLastSent(null);
      toast.info("Mission terminée : votre position n'est plus partagée.");
    } catch {
      setError("Impossible de terminer la mission (serveur injoignable). Réessayez.");
    } finally {
      setBusy(false);
    }
  }, [stopWatch]);

  const value = useMemo(
    () => ({ canMission, active, startedAt, position, lastSent, error, busy, start, finish }),
    [canMission, active, startedAt, position, lastSent, error, busy, start, finish]
  );

  return <MissionContext.Provider value={value}>{children}</MissionContext.Provider>;
}
