"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Crosshair, Eye, EyeOff, Loader2, LogIn, LogOut, MapPin, Plus, ShieldAlert, Trash2 } from "lucide-react";

import api from "@/lib/axios";
import { LookupItem, errorMessage, fetchLookup } from "@/lib/crud";
import { haversineKm } from "@/lib/geo";
import { PresenceDay, PresenceMode, PresenceState, flagLabel, fmtTime } from "@/lib/presence";
import { toast } from "@/lib/toast";
import { GoogleMap, MAPS_ENABLED, MapMarker } from "@/components/maps/GoogleMap";

interface Pos {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  at: number;
}

interface Line {
  taskId: string; // "" = nouvelle tâche
  title: string;
  note: string;
  progress: string;
  completed: boolean;
}

const emptyLine = (): Line => ({ taskId: "", title: "", note: "", progress: "", completed: false });

const inputClass = "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

/** Lit la position GPS de l'appareil (jamais saisie à la main : c'est la preuve de présence). */
function readPosition(): Promise<Pos> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("La localisation n'est pas disponible sur cet appareil."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, altitude: p.coords.altitude, accuracy: p.coords.accuracy, at: Date.now() }),
      (err) => reject(new Error(err.code === 1 ? "Localisation refusée : autorisez la position dans le navigateur, puis réessayez." : "Position indisponible : activez le GPS et réessayez.")),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

/**
 * « Ma présence du jour » : arrivée avec preuve GPS (position, altitude, précision comparées au siège / à la zone),
 * puis départ en déclarant les tâches faites aujourd'hui (elles alimentent le Suivi & Évaluation).
 */
export default function MyPresence() {
  const [state, setState] = useState<PresenceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [pos, setPos] = useState<Pos | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");
  // Altitude du terrain (estimation) : utilisée seulement pour l'AFFICHAGE quand le GPS de l'appareil ne fournit pas d'altitude
  const [terrainAlt, setTerrainAlt] = useState<number | null>(null);
  const [altLoading, setAltLoading] = useState(false);
  const altCall = useRef(0);
  const [showMap, setShowMap] = useState(true);
  const [mode, setMode] = useState<PresenceMode>("SIEGE");
  const [projects, setProjects] = useState<LookupItem[]>([]);
  const [projectId, setProjectId] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get("/presence/state");
      setState(res.data?.data ?? null);
    } catch (err) {
      setError(errorMessage(err, "Impossible de charger votre présence."));
    } finally {
      setLoading(false);
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
    void load();
    void locate();
  }, [load, locate]);

  // Les ordinateurs (position par Wi‑Fi / IP) ne renvoient pas d'altitude : on la déduit du terrain à cette position
  useEffect(() => {
    const call = ++altCall.current;
    setTerrainAlt(null);

    if (!pos || pos.altitude != null) {
      setAltLoading(false);
      return;
    }

    setAltLoading(true);
    api
      .get("/elevation", { params: { lat: pos.latitude, lng: pos.longitude } })
      .then((res) => {
        const value = res.data?.data?.elevation;
        if (call === altCall.current && typeof value === "number" && Number.isFinite(value)) setTerrainAlt(Math.round(value));
      })
      .catch(() => undefined)
      .finally(() => {
        if (call === altCall.current) setAltLoading(false);
      });
  }, [pos]);

  useEffect(() => {
    if (state && !state.isStagiaire && !projects.length) fetchLookup("projects").then(setProjects).catch(() => setProjects([]));
  }, [state, projects.length]);

  const today = state?.today ?? null;
  const checkedIn = !!today;
  const done = !!today?.checkOutAt;
  const activeMode: PresenceMode = today?.mode ?? mode;

  const distanceM = useMemo(() => {
    if (!pos || !state?.hq || activeMode !== "SIEGE") return null;
    return Math.round(haversineKm(pos.latitude, pos.longitude, state.hq.latitude, state.hq.longitude) * 1000);
  }, [pos, state?.hq, activeMode]);

  const insideSite = distanceM !== null && state ? distanceM <= state.rules.siteRadiusM : null;

  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = [];
    if (state?.hq) list.push({ id: "hq", latitude: state.hq.latitude, longitude: state.hq.longitude, title: state.hq.name, color: "#16a34a", shape: "square", info: "Siège de l'ONG" });
    if (pos) list.push({ id: "me", latitude: pos.latitude, longitude: pos.longitude, title: "Ma position actuelle", color: "#1d4ed8", info: pos.accuracy !== null ? `Précision ±${Math.round(pos.accuracy)} m` : undefined });
    return list;
  }, [state?.hq, pos]);

  const submitIn = async () => {
    setBusy(true);
    setError("");

    try {
      // Position relue au moment du pointage : c'est elle qui fait foi
      const fresh = await readPosition();
      setPos(fresh);

      await api.post("/presence/check-in", {
        mode,
        latitude: fresh.latitude,
        longitude: fresh.longitude,
        altitude: fresh.altitude,
        accuracy: fresh.accuracy,
        projectId: !state?.isStagiaire && projectId ? Number(projectId) : undefined,
      });
      toast.success("Arrivée pointée : position vérifiée.");
      await load();
    } catch (err) {
      setError(err instanceof Error && !("response" in err) ? err.message : errorMessage(err, "Pointage impossible."));
    } finally {
      setBusy(false);
    }
  };

  const setLine = (i: number, patch: Partial<Line>) => setLines((cur) => cur.map((l, k) => (k === i ? { ...l, ...patch } : l)));

  const pickTask = (i: number, taskId: string) => {
    const task = (state?.internship ? state.internship.tasks : state?.activities ?? []).find((t) => String(t.id) === taskId);
    setLine(i, { taskId, title: task ? task.title : "", progress: task ? String(task.progress) : "" });
  };

  const submitOut = async () => {
    setError("");

    const forInternship = !!state?.internship;
    const payload = lines.map((l) => ({
      internshipTaskId: forInternship && l.taskId ? Number(l.taskId) : undefined,
      activityId: !forInternship && l.taskId ? Number(l.taskId) : undefined,
      title: l.title.trim(),
      note: l.note.trim(),
      progress: l.progress === "" ? undefined : Number(l.progress),
      completed: l.completed,
    }));

    if (payload.some((l) => !l.internshipTaskId && !l.activityId && !l.title)) {
      setError("Chaque ligne doit désigner une tâche existante ou avoir un titre.");
      return;
    }
    if (payload.some((l) => l.progress !== undefined && (Number.isNaN(l.progress) || l.progress < 0 || l.progress > 100))) {
      setError("L'avancement d'une tâche doit être compris entre 0 et 100.");
      return;
    }

    setBusy(true);

    try {
      const fresh = await readPosition();
      setPos(fresh);

      await api.post("/presence/check-out", { latitude: fresh.latitude, longitude: fresh.longitude, altitude: fresh.altitude, accuracy: fresh.accuracy, tasks: payload, summary: summary.trim() || undefined });
      toast.success("Départ pointé : tâches du jour enregistrées.");
      setLines([emptyLine()]);
      setSummary("");
      await load();
    } catch (err) {
      setError(err instanceof Error && !("response" in err) ? err.message : errorMessage(err, "Pointage du départ impossible."));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-500 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement de votre présence…
      </div>
    );
  }

  if (!state) return error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null;

  const hh = (h: number) => `${String(h).padStart(2, "0")}h00`;
  // Stagiaire : tâches de son stage ; autre membre : activités du projet choisi (leur avancement met à jour le projet)
  const taskOptions: Array<{ id: number; title: string; progress: number }> = state.internship ? state.internship.tasks : state.activities;

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <MapPin className="h-5 w-5 text-blue-800" /> Ma présence du jour
          </h2>
          <p className="text-xs text-gray-500">
            Pointez votre arrivée avec votre position GPS (preuve que vous êtes bien sur place), puis, avant de partir, déclarez les tâches faites aujourd&apos;hui. Jours ouvrables, {hh(state.rules.openHour)}–{hh(state.rules.closeHour)}.
          </p>
        </div>

        {checkedIn && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-green-100 px-3 py-1 font-medium text-green-800">Arrivée {fmtTime(today!.checkInAt)}</span>
            <span className={`rounded-full px-3 py-1 font-medium ${done ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{done ? `Départ ${fmtTime(today!.checkOutAt)}` : "Départ à pointer"}</span>
            {today!.status === "SUSPECT" && <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-700">À vérifier</span>}
          </div>
        )}
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* ------------------------------ position GPS ------------------------------ */}
      <div className="space-y-3 rounded-xl border border-gray-200 p-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">Latitude</span>
            <input readOnly value={pos ? pos.latitude.toFixed(6) : ""} placeholder="—" className={`${inputClass} font-semibold`} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">Longitude</span>
            <input readOnly value={pos ? pos.longitude.toFixed(6) : ""} placeholder="—" className={`${inputClass} font-semibold`} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">Altitude (m)</span>
            <input
              readOnly
              value={pos?.altitude != null ? String(Math.round(pos.altitude)) : terrainAlt !== null ? String(terrainAlt) : ""}
              placeholder={!pos ? "—" : altLoading ? "calcul…" : "indisponible"}
              className={inputClass}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-gray-600">Précision (± m)</span>
            <input readOnly value={pos?.accuracy != null ? String(Math.round(pos.accuracy)) : ""} placeholder="—" className={inputClass} />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void locate()} disabled={locating} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />} Ma position actuelle
          </button>

          {MAPS_ENABLED && (
            <button type="button" onClick={() => setShowMap((v) => !v)} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              {showMap ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {showMap ? "Masquer la carte" : "Afficher la carte"}
            </button>
          )}

          {distanceM !== null && state.hq && (
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${insideSite ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
              {insideSite ? `Au siège (${distanceM} m)` : `À ${distanceM} m du siège : hors zone (maximum ${state.rules.siteRadiusM} m)`}
            </span>
          )}
        </div>

        {geoError && <p className="text-sm text-red-600">{geoError}</p>}
        <p className="text-xs text-gray-500">Position issue du GPS de l’appareil (non modifiable), comparée au siège et à l’altitude du terrain.</p>

        {MAPS_ENABLED && showMap && markers.length > 0 && <GoogleMap markers={markers} height={240} refit />}
      </div>

      {/* ------------------------------ arrivée ------------------------------ */}
      {!checkedIn && (
        <div className="space-y-3">
          {state.blockedReason ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{state.blockedReason}</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-gray-600">Lieu de travail aujourd&apos;hui</span>
                  <select value={mode} onChange={(e) => setMode(e.target.value as PresenceMode)} className={inputClass}>
                    <option value="SIEGE">Au siège de l&apos;ONG</option>
                    <option value="TERRAIN">Sur le terrain / en mission</option>
                  </select>
                </label>

                {!state.isStagiaire && (
                  <label className="block text-sm">
                    <span className="mb-1 block text-gray-600">Projet concerné (facultatif)</span>
                    <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputClass}>
                      <option value="">— Aucun —</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>

              {state.internship && <p className="text-xs text-gray-500">Stage : {state.internship.title}</p>}

              <button type="button" onClick={() => void submitIn()} disabled={busy || locating} className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Pointer mon arrivée
              </button>
            </>
          )}
        </div>
      )}

      {/* ------------------------------ résumé de l'arrivée ------------------------------ */}
      {checkedIn && (
        <div className="rounded-xl border border-gray-200 p-4 text-sm text-gray-700">
          <p className="flex flex-wrap items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Arrivée vérifiée à {fmtTime(today!.checkInAt)} — {today!.mode === "SIEGE" ? "au siège" : "sur le terrain"}
            {today!.checkIn.distanceM !== null ? ` (${today!.checkIn.distanceM} m du ${today!.mode === "SIEGE" ? "siège" : "centre de la zone"})` : ""}
            {today!.checkIn.expectedAltitude !== null && today!.checkIn.altitude !== null ? ` · altitude ${Math.round(today!.checkIn.altitude)} m (terrain ≈ ${today!.checkIn.expectedAltitude} m)` : ""}.
          </p>
          {today!.flags.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-amber-800">
              {today!.flags.map((f) => (
                <li key={f} className="flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5" /> {flagLabel(f)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ------------------------------ départ + tâches du jour ------------------------------ */}
      {checkedIn && !done && (
        <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
          <h3 className="font-semibold text-gray-900">Tâches faites aujourd&apos;hui (obligatoire avant de partir)</h3>
          <p className="text-xs text-gray-600">
            {state.internship ? "Ces tâches mettent à jour « Suivi &amp; Évaluation »." : taskOptions.length > 0 ? "Choisissez l’activité du projet (mise à jour dans « Suivi &amp; Évaluation »)." : "Ces tâches sont enregistrées dans votre journal de présence."}
          </p>

          {lines.map((l, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-gray-200 bg-white p-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_110px]">
                {taskOptions.length > 0 ? (
                  <select value={l.taskId} onChange={(e) => pickTask(i, e.target.value)} className={inputClass}>
                    <option value="">{state.internship ? "Nouvelle tâche…" : "Autre tâche (hors activité)…"}</option>
                    {taskOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.progress} %)
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="self-center text-xs text-gray-500">Tâche réalisée</span>
                )}

                <input value={l.title} readOnly={!!l.taskId} onChange={(e) => setLine(i, { title: e.target.value })} placeholder="Titre de la tâche" className={inputClass} />

                <input type="number" min={0} max={100} value={l.progress} onChange={(e) => setLine(i, { progress: e.target.value })} placeholder="% avancé" className={inputClass} />
              </div>

              <textarea value={l.note} onChange={(e) => setLine(i, { note: e.target.value })} rows={2} placeholder="Ce qui a été fait (compte rendu)" className={inputClass} />

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={l.completed} onChange={(e) => setLine(i, { completed: e.target.checked })} className="h-4 w-4" /> Tâche terminée
                </label>
                {lines.length > 1 && (
                  <button type="button" onClick={() => setLines((cur) => cur.filter((_, k) => k !== i))} className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline">
                    <Trash2 className="h-3.5 w-3.5" /> Retirer
                  </button>
                )}
              </div>
            </div>
          ))}

          <button type="button" onClick={() => setLines((cur) => [...cur, emptyLine()])} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-800 hover:underline">
            <Plus className="h-4 w-4" /> Ajouter une tâche
          </button>

          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} placeholder="Bilan de la journée (facultatif)" className={inputClass} />

          <button type="button" onClick={() => void submitOut()} disabled={busy || locating} className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />} Pointer mon départ
          </button>
        </div>
      )}

      {done && today && <DoneSummary day={today} />}
    </section>
  );
}

function DoneSummary({ day }: { day: PresenceDay }) {
  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
      <p className="font-semibold">Journée terminée : {day.tasks.length} tâche(s) déclarée(s).</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
        {day.tasks.map((t) => (
          <li key={t.id}>
            {t.title}
            {t.progress !== null ? ` — ${t.progress} %` : ""}
            {t.completed ? " (terminée)" : ""}
            {t.note ? ` : ${t.note}` : ""}
          </li>
        ))}
      </ul>
      {day.summary && <p className="mt-2 text-xs">Bilan : {day.summary}</p>}
    </div>
  );
}
