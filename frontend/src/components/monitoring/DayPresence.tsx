"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Crosshair, Loader2, LogIn, MapPinned } from "lucide-react";

import api from "@/lib/axios";
import { errorMessage } from "@/lib/crud";
import { haversineKm } from "@/lib/geo";
import { fmtTime, type PresenceAbsence, type PresenceDay, type PresenceMode, type PresenceState } from "@/lib/presence";
import { toast } from "@/lib/toast";
import { DayTasksForm } from "@/components/monitoring/DayTasksForm";

interface Pos {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
}

/** Position GPS de l'appareil (jamais saisie à la main : c'est la preuve de présence). */
function readPosition(): Promise<Pos> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("La localisation n'est pas disponible sur cet appareil."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, altitude: p.coords.altitude, accuracy: p.coords.accuracy }),
      (err) => reject(new Error(err.code === 1 ? "Localisation refusée : autorisez la position dans le navigateur, puis réessayez." : "Position indisponible : activez le GPS et réessayez.")),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

const fmtDistance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(m >= 10000 ? 0 : 1)} km` : `${m} m`);

interface Props {
  /** Jour affiché (YYYY-MM-DD) et jour courant */
  day: string;
  today: string;
  /** Pointage enregistré ce jour-là (journal GPS), s'il existe */
  recorded?: PresenceDay;
  /** Jour ouvré passé, dans la période du stage, sans aucun pointage */
  missed: boolean;
  weekend: boolean;
  /** Recharge l'agenda après un pointage */
  onChanged?: () => void;
}

/**
 * « Ma présence » du jour sélectionné : position actuelle par rapport à l'ONG, distance, et choix 1 (présent) / 0 (absent).
 * 1 = pointer l'arrivée via /presence/check-in (le serveur vérifie le GPS) ;
 * 0 = déclarer l'absence du jour via /presence/absence (enregistrée avec un motif facultatif, annulable tant que l'arrivée n'est pas pointée).
 */
export function DayPresence({ day, today, recorded, missed, weekend, onChanged }: Props) {
  const isToday = day === today;

  const [state, setState] = useState<PresenceState | null>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [choice, setChoice] = useState<0 | 1>(1);
  const [mode, setMode] = useState<PresenceMode>("SIEGE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [absences, setAbsences] = useState<PresenceAbsence[]>([]);
  const [reason, setReason] = useState("");

  const loadAbsences = useCallback(async () => {
    try {
      const res = await api.get("/presence/absence", { params: { days: 120 } });
      setAbsences(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      setAbsences([]);
    }
  }, []);

  const loadState = useCallback(async () => {
    try {
      const res = await api.get("/presence/state");
      setState(res.data?.data ?? null);
    } catch (err) {
      setError(errorMessage(err, "Impossible de charger l'état de présence."));
    }
  }, []);

  const locate = useCallback(async () => {
    setLocating(true);
    setGeoError("");
    try {
      setPos(await readPosition());
    } catch (err) {
      setGeoError((err as Error).message);
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    void loadAbsences();
  }, [loadAbsences]);

  useEffect(() => {
    if (!isToday) return;
    void loadState();
    void locate();
  }, [isToday, loadState, locate]);

  const hq = state?.hq ?? null;
  const radius = state?.rules.siteRadiusM ?? null;
  const distanceM = useMemo(() => {
    if (!pos || !hq) return null;
    return Math.round(haversineKm(pos.latitude, pos.longitude, hq.latitude, hq.longitude) * 1000);
  }, [pos, hq]);
  const inside = distanceM !== null && radius !== null ? distanceM <= radius : null;

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const fresh = await readPosition(); // la position relue au moment du pointage fait foi
      setPos(fresh);
      await api.post("/presence/check-in", { mode, latitude: fresh.latitude, longitude: fresh.longitude, altitude: fresh.altitude, accuracy: fresh.accuracy });
      toast.success("Présence enregistrée : position vérifiée.");
      await Promise.all([loadState(), loadAbsences()]);
      onChanged?.();
    } catch (err) {
      setError(err instanceof Error && !("response" in err) ? err.message : errorMessage(err, "Pointage impossible."));
    } finally {
      setBusy(false);
    }
  };

  const declareAbsent = async () => {
    setBusy(true);
    setError("");
    try {
      await api.post("/presence/absence", { reason: reason.trim() || undefined });
      toast.success("Absence enregistrée.");
      setReason("");
      await loadAbsences();
      onChanged?.();
    } catch (err) {
      setError(errorMessage(err, "Impossible d'enregistrer l'absence."));
    } finally {
      setBusy(false);
    }
  };

  const cancelAbsent = async () => {
    setBusy(true);
    setError("");
    try {
      await api.delete("/presence/absence");
      toast.success("Absence annulée.");
      setChoice(1);
      await loadAbsences();
      onChanged?.();
    } catch (err) {
      setError(errorMessage(err, "Impossible d'annuler l'absence."));
    } finally {
      setBusy(false);
    }
  };

  const absenceOn = (d: string) => absences.find((a) => a.day === d) ?? null;

  const seg = (active: boolean, tone: string) =>
    `rounded-lg border px-3 py-1.5 text-xs font-bold transition ${active ? tone : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`;

  /* ------------------------- autres jours : lecture seule ------------------------- */
  if (!isToday) {
    const dist = recorded?.checkIn.distanceM ?? null;
    return (
      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
        <MapPinned className="h-3.5 w-3.5 text-slate-500" />
        {recorded ? (
          <span className="font-medium text-emerald-700">
            1 · Présent
            {dist !== null ? ` — à ${fmtDistance(dist)} de ${recorded.mode === "SIEGE" ? "l’ONG" : "la zone"} à l’arrivée` : ""}
            {` (arrivée ${fmtTime(recorded.checkInAt)}${recorded.checkOutAt ? ` · départ ${fmtTime(recorded.checkOutAt)}` : " · départ non pointé"})`}
          </span>
        ) : weekend ? (
          <span className="text-slate-500">Week-end : jour non compté.</span>
        ) : absenceOn(day) ? (
          <span className="font-medium text-red-600">0 · Absent — absence déclarée{absenceOn(day)?.reason ? ` : ${absenceOn(day)?.reason}` : ""}.</span>
        ) : missed ? (
          <span className="font-medium text-red-600">0 · Absent — aucun pointage ce jour ouvré (absence non déclarée).</span>
        ) : day > today ? (
          <span className="text-slate-500">Jour à venir.</span>
        ) : (
          <span className="text-slate-500">Pas de pointage enregistré.</span>
        )}
      </div>
    );
  }

  /* ------------------------- aujourd'hui ------------------------- */
  const checkedIn = !!state?.today;
  const arrival = state?.today ?? recorded ?? null;
  const absenceToday = absenceOn(day);

  return (
    <div className="mb-3 space-y-3 rounded-lg border border-slate-200 bg-white p-3 text-xs">
      <p className="flex items-center gap-1.5 font-semibold text-slate-800">
        <MapPinned className="h-4 w-4 text-slate-500" /> Ma présence aujourd’hui
      </p>

      {/* position actuelle par rapport à l'ONG */}
      <div className="space-y-2 rounded-lg bg-slate-50 p-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void locate()} disabled={locating} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />} Ma position actuelle
          </button>

          {distanceM !== null && hq ? (
            <span className={`rounded-full px-3 py-1 font-semibold ${inside ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
              Distance à l’ONG : {fmtDistance(distanceM)}
              {radius !== null ? (inside ? " — dans la zone" : ` — hors zone (max ${radius} m)`) : ""}
            </span>
          ) : state && !hq ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800">Aucun siège d’ONG enregistré : distance indisponible.</span>
          ) : null}
        </div>

        <p className="text-slate-600">
          {pos
            ? `Position : ${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)}${pos.accuracy !== null ? ` (±${Math.round(pos.accuracy)} m)` : ""}${hq ? ` · ONG : ${hq.name}` : ""}`
            : locating
              ? "Localisation en cours…"
              : "Position non lue."}
        </p>
        {geoError && <p className="text-red-600">{geoError}</p>}
      </div>

      {/* 1 présent / 0 absent */}
      {checkedIn && arrival ? (
        <div className="space-y-1">
          <p className="font-medium text-emerald-700">
            1 · Présent — arrivée {fmtTime(arrival.checkInAt)}
            {arrival.checkIn.distanceM !== null ? ` à ${fmtDistance(arrival.checkIn.distanceM)} de ${arrival.mode === "SIEGE" ? "l’ONG" : "la zone"}` : ""}
            {arrival.checkOutAt ? ` · départ ${fmtTime(arrival.checkOutAt)}` : ""}
          </p>
          {arrival.checkOutAt && arrival.tasks.length > 0 && (
            <p className="text-slate-600">{arrival.tasks.length} tâche(s) déclarée(s) : {arrival.tasks.map((t) => t.title).join(", ")}.</p>
          )}
        </div>
      ) : absenceToday ? (
        <div className="space-y-2">
          <p className="font-medium text-red-600">
            0 · Absent — absence enregistrée{absenceToday.reason ? ` : ${absenceToday.reason}` : ""}.
          </p>
          <button type="button" onClick={() => void cancelAbsent()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Annuler l’absence
          </button>
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</p>}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700">Présence :</span>
            <button type="button" onClick={() => setChoice(1)} aria-pressed={choice === 1} className={seg(choice === 1, "border-emerald-600 bg-emerald-600 text-white")}>
              1 · Présent
            </button>
            <button type="button" onClick={() => setChoice(0)} aria-pressed={choice === 0} className={seg(choice === 0, "border-red-600 bg-red-600 text-white")}>
              0 · Absent
            </button>
          </div>

          {choice === 1 ? (
            state?.blockedReason ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">{state.blockedReason}</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <select value={mode} onChange={(e) => setMode(e.target.value as PresenceMode)} aria-label="Lieu de travail" className="rounded-lg border border-slate-300 px-2 py-1.5">
                  <option value="SIEGE">Au siège de l’ONG</option>
                  <option value="TERRAIN">Sur le terrain / en mission</option>
                </select>
                <button type="button" onClick={() => void submit()} disabled={busy || locating || !state} className="inline-flex items-center gap-1.5 rounded-lg bg-green-700 px-4 py-1.5 font-semibold text-white hover:bg-green-800 disabled:opacity-60">
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />} Valider ma présence
                </button>
              </div>
            )
          ) : (
            <div className="space-y-2">
              <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Motif de l’absence (facultatif)" aria-label="Motif de l’absence" className="w-full rounded-lg border border-slate-300 px-3 py-1.5" />
              <button type="button" onClick={() => void declareAbsent()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Enregistrer mon absence
              </button>
              <p className="text-slate-500">Vous pourrez l’annuler, puis pointer votre arrivée, tant que vous n’avez pas validé votre présence.</p>
            </div>
          )}

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</p>}
        </div>
      )}

      {/* tâches du jour + départ : seulement après l'arrivée pointée */}
      {checkedIn && state && !state.today?.checkOutAt && (
        <DayTasksForm
          state={state}
          onDone={async () => {
            await Promise.all([loadState(), loadAbsences()]);
            onChanged?.();
          }}
        />
      )}
    </div>
  );
}
