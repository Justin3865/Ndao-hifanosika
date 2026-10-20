"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ClipboardCheck, Clock, Mountain, Route } from "lucide-react";
import api from "@/lib/axios";
import { AppLayout } from "@/components/layout";
import { GoogleMap, MapLine, MapMarker } from "@/components/maps/GoogleMap";
import { errorMessage, fmtDateTime } from "@/lib/crud";
import { fmtKm } from "@/lib/geo";

interface MissionRow {
  id: number;
  agent: { id: number; name: string };
  startedAt: string;
  endedAt: string | null;
  distanceKm: number;
  pointsCount: number;
  surveysCount: number;
}

interface MissionDetail {
  mission: { id: number; agentName: string; startedAt: string; endedAt: string | null; distanceKm: number };
  points: Array<{ latitude: number; longitude: number; altitude: number | null; createdAt: string }>;
  surveys: Array<{ id: number; beneficiaryName: string; latitude: number | null; longitude: number | null; vulnerable: boolean; createdAt: string }>;
}

interface AgentOption { id: number; name: string }

function duration(start: string, end: string | null) {
  const minutes = Math.round(((end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime()) / 60000);
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

function HistoryContent() {
  const params = useSearchParams();
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [agentId, setAgentId] = useState(params.get("agent") ?? "");
  const [days, setDays] = useState("7");
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<MissionDetail | null>(null);

  useEffect(() => {
    api.get("/tracking/agents").then((res) => setAgents((res.data?.data ?? []).map((a: AgentOption) => ({ id: a.id, name: a.name })))).catch(() => undefined);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");

    const from = new Date(Date.now() - Number(days) * 24 * 3600 * 1000).toISOString();

    api
      .get("/tracking/missions", { params: { ...(agentId ? { agentId } : {}), from } })
      .then((res) => setMissions(res.data?.data ?? []))
      .catch((err) => setError(errorMessage(err, "Historique indisponible.")))
      .finally(() => setLoading(false));
  }, [agentId, days]);

  const open = (id: number) =>
    api
      .get(`/tracking/missions/${id}`)
      .then((res) => setDetail(res.data?.data ?? null))
      .catch((err) => setError(errorMessage(err, "Mission introuvable.")));

  const markers: MapMarker[] = useMemo(() => {
    if (!detail || detail.points.length === 0) return [];

    const first = detail.points[0];
    const last = detail.points[detail.points.length - 1];

    return [
      { id: "start", latitude: first.latitude, longitude: first.longitude, title: "Départ", color: "#16a34a", radius: 10, info: fmtDateTime(first.createdAt) },
      { id: "end", latitude: last.latitude, longitude: last.longitude, title: detail.mission.endedAt ? "Arrivée" : "Dernière position", color: "#dc2626", radius: 10, info: fmtDateTime(last.createdAt) },
      ...detail.surveys
        .filter((s) => s.latitude !== null && s.longitude !== null)
        .map((s) => ({
          id: `s-${s.id}`, latitude: s.latitude as number, longitude: s.longitude as number, title: s.beneficiaryName,
          color: s.vulnerable ? "#f97316" : "#2563eb", shape: "square" as const, radius: 8, info: `Enquête — ${fmtDateTime(s.createdAt)}`,
        })),
    ];
  }, [detail]);

  const lines: MapLine[] = useMemo(() => {
    if (!detail || detail.points.length < 2) return [];

    return [{
      id: "trail",
      from: detail.points[0],
      to: detail.points[detail.points.length - 1],
      path: detail.points,
      solid: true,
      arrow: true,
      color: "#1d4ed8",
    }];
  }, [detail]);

  const altitudes = detail?.points.map((p) => p.altitude).filter((v): v is number => v !== null) ?? [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/tracking" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" /> Suivi terrain
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Historique des missions</h1>
            <p className="text-sm text-gray-500">Trajets conservés 90 jours, avec les enquêtes réalisées en chemin.</p>
          </div>

          <div className="flex gap-3">
            <select value={agentId} onChange={(e) => { setAgentId(e.target.value); setDetail(null); }} className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm">
              <option value="">Tous les agents</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select value={days} onChange={(e) => { setDays(e.target.value); setDetail(null); }} className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm">
              <option value="1">24 heures</option>
              <option value="7">7 jours</option>
              <option value="30">30 jours</option>
              <option value="90">90 jours</option>
            </select>
          </div>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            {loading && <p className="p-4 text-sm text-gray-500">Chargement...</p>}
            {!loading && missions.length === 0 && <p className="p-6 text-center text-sm text-gray-500">Aucune mission sur cette période.</p>}

            <div className="max-h-[640px] space-y-2 overflow-y-auto">
              {missions.map((m) => (
                <button key={m.id} type="button" onClick={() => open(m.id)} className={`w-full rounded-xl border p-3 text-left transition hover:bg-gray-50 ${detail?.mission.id === m.id ? "border-blue-400 bg-blue-50" : "border-gray-100"}`}>
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">{m.agent.name}</p>
                    {!m.endedAt && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">En cours</span>}
                  </div>
                  <p className="text-xs text-gray-500">{fmtDateTime(m.startedAt)}</p>
                  <p className="mt-1 flex flex-wrap gap-x-4 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {duration(m.startedAt, m.endedAt)}</span>
                    <span className="inline-flex items-center gap-1"><Route className="h-3 w-3" /> {fmtKm(m.distanceKm)}</span>
                    <span className="inline-flex items-center gap-1"><ClipboardCheck className="h-3 w-3" /> {m.surveysCount} enquête(s)</span>
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            {detail ? (
              <>
                <div className="mb-3 grid gap-3 px-2 sm:grid-cols-4">
                  {[
                    ["Agent", detail.mission.agentName],
                    ["Durée", duration(detail.mission.startedAt, detail.mission.endedAt)],
                    ["Distance", fmtKm(detail.mission.distanceKm)],
                    ["Altitude min–max", altitudes.length ? `${Math.round(Math.min(...altitudes))}–${Math.round(Math.max(...altitudes))} m` : "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className="flex items-center gap-1 font-semibold text-gray-900">{label === "Altitude min–max" && <Mountain className="h-4 w-4 text-gray-400" />}{value}</p>
                    </div>
                  ))}
                </div>

                {detail.points.length === 0
                  ? <p className="p-8 text-center text-sm text-gray-500">Aucun point GPS enregistré pour cette mission.</p>
                  : <GoogleMap markers={markers} lines={lines} height={520} refit />}
              </>
            ) : (
              <p className="p-16 text-center text-sm text-gray-500">Sélectionnez une mission pour afficher son trajet sur la carte.</p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <HistoryContent />
    </Suspense>
  );
}
