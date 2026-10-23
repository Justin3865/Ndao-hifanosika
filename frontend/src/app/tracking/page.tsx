"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown, ClipboardList, ExternalLink, History, Home, Mountain, Navigation, Phone, Radio, Route as RouteIcon,
  Users, Wifi, WifiOff,
} from "lucide-react";
import api from "@/lib/axios";
import { getSocket } from "@/lib/socket";
import { AppLayout } from "@/components/layout";
import { GoogleMap, MapLine, MapMarker, MapRoute, RouteInfo } from "@/components/maps/GoogleMap";
import {
  AGENT_COLOR,
  AGENT_LABEL,
  Agent,
  AgentStatusKey,
  HouseholdPoint,
  PRESENCE_COLOR,
  PRESENCE_LABEL,
  agentStatus,
  presenceOf,
  scoreColor,
  useAgents,
  useFieldSummary,
  useHouseholds,
  useLiveTargets,
} from "@/lib/useLiveTargets";
import { fmtDateTime } from "@/lib/crud";
import { directionsUrl, fmtKm, haversineKm } from "@/lib/geo";

type Tab = "agents" | "households" | "targets";
type AgentFilter = "ALL" | "MISSION" | "ONLINE" | "OFFLINE";

const yn = (v: boolean | null | undefined) => (v === null || v === undefined ? "—" : v ? "Oui" : "Non");

/** Enquête ménage d'un agent, avec toutes les réponses (GET /tracking/agents/:id/surveys) */
interface AgentSurvey {
  id: number;
  beneficiaryId: number;
  beneficiaryName: string;
  projectName: string | null;
  locality: string | null;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  householdSize: number | null;
  monthlyIncome: number | null;
  childrenUnder5: number | null;
  outOfSchoolChildren: number | null;
  mealsPerDay: number | null;
  hasDisability: boolean;
  healthIssues: boolean | null;
  waterAccess: boolean | null;
  electricityAccess: boolean | null;
  housingType: string | null;
  vulnerable: boolean;
  notes: string | null;
  createdAt: string;
}

/** Toutes les réponses d'une enquête, dans l'ordre du questionnaire */
function surveyRows(sv: AgentSurvey): Array<[string, string]> {
  const n = (v: number | null) => (v === null || v === undefined ? "—" : String(v));

  return [
    ["Taille du ménage", n(sv.householdSize)],
    ["Revenu mensuel", sv.monthlyIncome !== null ? `${sv.monthlyIncome.toLocaleString("fr-FR")} Ar` : "—"],
    ["Enfants de moins de 5 ans", n(sv.childrenUnder5)],
    ["Enfants non scolarisés", n(sv.outOfSchoolChildren)],
    ["Repas par jour", n(sv.mealsPerDay)],
    ["Handicap dans le ménage", yn(sv.hasDisability)],
    ["Problèmes de santé", yn(sv.healthIssues)],
    ["Accès à l'eau", yn(sv.waterAccess)],
    ["Accès à l'électricité", yn(sv.electricityAccess)],
    ["Type d'habitat", sv.housingType ?? "—"],
    ["Jugé vulnérable par l'agent", yn(sv.vulnerable)],
  ];
}

function ago(value: string | null): string {
  if (!value) return "—";
  const s = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (s < 60) return `il y a ${s} s`;
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
  return fmtDateTime(value);
}

export default function TrackingPage() {
  const summary = useFieldSummary(true);
  const hq = summary?.hq ?? null;

  const { agents: rawAgents } = useAgents(true, hq ? { latitude: hq.latitude, longitude: hq.longitude } : null);
  const { targets, connected } = useLiveTargets(true);
  const { households } = useHouseholds(true);

  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("agents");
  const [filter, setFilter] = useState<AgentFilter>("ALL");
  const [layers, setLayers] = useState({ agents: true, households: true, targets: true });
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [agentSurveys, setAgentSurveys] = useState<AgentSurvey[]>([]);
  const [openSurvey, setOpenSurvey] = useState<number | null>(null);
  const [focusSurvey, setFocusSurvey] = useState<number | null>(null);
  const [, tick] = useState(0);

  // « Signal perdu » et « il y a x min » se recalculent toutes les 15 s
  useEffect(() => {
    const timer = window.setInterval(() => tick((n) => n + 1), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const agents: Array<Agent & { live: AgentStatusKey }> = useMemo(
    () => rawAgents.map((a) => ({ ...a, live: agentStatus(a) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawAgents, tick]
  );

  const online = agents.filter((a) => a.online).length;
  const onMission = agents.filter((a) => a.live === "MISSION" || a.live === "LOST").length;

  // Ménages prioritaires = ménages enquêtés par les agents en mission dont le score est ≥ 70
  const priority = useMemo(
    () => households.filter((h) => h.surveyed && h.score >= 70).sort((a, b) => b.score - a.score),
    [households]
  );

  const surveyedCount = summary?.surveyedHouseholds ?? households.filter((h) => h.surveyed).length;

  const located = agents.filter((a) => a.latitude !== null && a.longitude !== null);

  /** Distance siège -> agent (à vol d'oiseau), calculée ici si le serveur ne l'a pas fournie */
  const hqKm = (a: Agent): number | null =>
    a.distanceToHqKm ??
    (hq && a.latitude !== null && a.longitude !== null
      ? Math.round(haversineKm(hq.latitude, hq.longitude, a.latitude, a.longitude) * 10) / 10
      : null);

  const selectedAgentId = selected?.startsWith("s-") ? Number(selected.slice(2)) : null;

  // Toutes les enquêtes de l'agent sélectionné (et mise à jour quand une nouvelle enquête arrive)
  useEffect(() => {
    setAgentSurveys([]);
    setOpenSurvey(null);
    setFocusSurvey(null);

    if (!selectedAgentId) return;

    let cancelled = false;

    const load = () =>
      api
        .get(`/tracking/agents/${selectedAgentId}/surveys`)
        .then((res) => {
          if (!cancelled) setAgentSurveys(res.data?.data ?? []);
        })
        .catch(() => undefined);

    void load();

    const socket = getSocket();
    socket?.on("survey:new", load);

    return () => {
      cancelled = true;
      socket?.off("survey:new", load);
    };
  }, [selectedAgentId]);

  /* ------------------------------ carte ------------------------------ */

  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = [];

    if (hq) {
      list.push({
        id: "hq", latitude: hq.latitude, longitude: hq.longitude, title: hq.name, color: "#111827", shape: "square", radius: 11,
        info: hq.address ?? "Siège de l'ONG",
      });
    }

    if (layers.agents) {
      located.forEach((a) =>
        list.push({
          id: `s-${a.id}`,
          latitude: a.latitude as number,
          longitude: a.longitude as number,
          title: `Agent : ${a.name}`,
          color: AGENT_COLOR[a.live],
          shape: "square",
          radius: 9,
          info: [
            AGENT_LABEL[a.live],
            `Altitude : ${a.altitude !== null ? `${Math.round(a.altitude)} m` : "?"}`,
            `Distance du siège : ${hqKm(a) !== null ? fmtKm(hqKm(a)) : "?"}`,
            `Dernier signal : ${ago(a.updatedAt)}`,
            `Enquêtes : ${a.surveysTotal}`,
          ].join("\n"),
        })
      );
    }

    // Enquêtes de l'agent sélectionné : un point par ménage enquêté, avec les réponses dans la bulle
    agentSurveys
      .filter((sv) => sv.latitude !== null && sv.longitude !== null)
      .forEach((sv) =>
        list.push({
          id: `sv-${sv.id}`,
          latitude: sv.latitude as number,
          longitude: sv.longitude as number,
          title: `Enquête : ${sv.beneficiaryName}`,
          color: sv.vulnerable ? "#dc2626" : "#0d9488",
          radius: 7,
          info: [
            `${fmtDateTime(sv.createdAt)}${sv.locality ? ` — ${sv.locality}` : ""}`,
            ...surveyRows(sv).map(([label, value]) => `${label} : ${value}`),
            `Altitude : ${sv.altitude !== null ? `${Math.round(sv.altitude)} m` : "?"}`,
            hq && sv.latitude !== null && sv.longitude !== null
              ? `Distance du siège : ${fmtKm(Math.round(haversineKm(hq.latitude, hq.longitude, sv.latitude, sv.longitude) * 10) / 10)}`
              : "",
            sv.notes ? `Notes : ${sv.notes}` : "",
          ].filter(Boolean).join("\n"),
        })
      );

    if (layers.households) {
      priority
        .filter((h) => h.latitude !== null && h.longitude !== null)
        .forEach((h) =>
          list.push({
            id: `h-${h.id}`,
            latitude: h.latitude as number,
            longitude: h.longitude as number,
            title: h.name,
            color: scoreColor(h.score),
            radius: 9 + Math.round(h.score / 25),
            info: `Ménage prioritaire — score ${h.score}/100 — altitude ${h.altitude ?? "?"} m${h.distanceToHqKm !== null ? ` — ${fmtKm(h.distanceToHqKm)} du siège` : ""}`,
          })
        );
    }

    if (layers.targets) {
      targets
        .filter((t) => t.latitude !== null && t.longitude !== null)
        .forEach((t) =>
          list.push({
            id: `t-${t.id}`,
            latitude: t.latitude as number,
            longitude: t.longitude as number,
            title: `${t.firstName} ${t.lastName}`,
            color: PRESENCE_COLOR[presenceOf(t.lastSeenAt)],
            shape: "triangle",
            radius: 8,
            info: `${t.project?.name ?? ""} — ${PRESENCE_LABEL[presenceOf(t.lastSeenAt)]}`,
          })
        );
    }

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, located, priority, targets, hq, agentSurveys]);

  const selectedAgent = selected?.startsWith("s-") ? agents.find((a) => `s-${a.id}` === selected) ?? null : null;
  const selectedHousehold: HouseholdPoint | null = selected?.startsWith("h-") ? priority.find((h) => `h-${h.id}` === selected) ?? null : null;

  // Itinéraire siège -> agent sélectionné, avec petite flèche bleue qui pointe vers l'agent
  const route: MapRoute | null = useMemo(() => {
    if (!selectedAgent || selectedAgent.latitude === null || selectedAgent.longitude === null || !hq) return null;

    return {
      from: { lat: hq.latitude, lng: hq.longitude },
      to: { lat: selectedAgent.latitude, lng: selectedAgent.longitude },
      color: "#2563eb",
      label: true, // distance siège -> agent écrite sur la carte
    };
  }, [selectedAgent, hq]);

  // Agent le plus proche d'un ménage prioritaire (flèche vers le ménage)
  const nearestAgent = useMemo(() => {
    if (!selectedHousehold || selectedHousehold.latitude === null || selectedHousehold.longitude === null) return null;

    let best: { agent: Agent; km: number } | null = null;

    for (const a of located) {
      const km = haversineKm(a.latitude as number, a.longitude as number, selectedHousehold.latitude, selectedHousehold.longitude);
      if (!best || km < best.km) best = { agent: a, km };
    }

    return best;
  }, [selectedHousehold, located]);

  const lines: MapLine[] = useMemo(() => {
    if (!selectedHousehold || !nearestAgent || selectedHousehold.latitude === null || selectedHousehold.longitude === null) return [];

    return [{
      id: "to-household",
      from: { latitude: nearestAgent.agent.latitude as number, longitude: nearestAgent.agent.longitude as number },
      to: { latitude: selectedHousehold.latitude, longitude: selectedHousehold.longitude },
      label: fmtKm(nearestAgent.km),
      color: "#2563eb",
      solid: true,
      arrow: true,
    }];
  }, [selectedHousehold, nearestAgent]);

  const select = (id: string) => {
    // Clic sur une enquête (carte ou liste) : on garde l'agent sélectionné et on ouvre ses réponses
    if (id.startsWith("sv-")) {
      const n = Number(id.slice(3));
      setFocusSurvey(n);
      setOpenSurvey(n);
      return;
    }

    setRouteInfo(null);
    setFocusSurvey(null);
    setOpenSurvey(null);
    setSelected(id);
  };

  const filteredAgents = agents.filter((a) =>
    filter === "ALL" ? true : filter === "MISSION" ? a.live === "MISSION" || a.live === "LOST" : filter === "ONLINE" ? a.live === "ONLINE" : a.live === "OFFLINE"
  );

  const cards = [
    { label: "Agents en ligne", value: `${online} / ${agents.length}`, icon: Wifi, color: "text-green-700 bg-green-100" },
    { label: "Agents hors ligne", value: agents.length - online, icon: WifiOff, color: "text-gray-700 bg-gray-100" },
    { label: "Agents en mission", value: onMission, icon: Navigation, color: "text-blue-700 bg-blue-100" },
    { label: "Ménages enquêtés (tous agents)", value: surveyedCount, icon: ClipboardList, color: "text-indigo-700 bg-indigo-100" },
    { label: "Ménages prioritaires (≥ 70)", value: priority.length, icon: Users, color: "text-red-700 bg-red-100" },
    { label: "Bénéficiaires suivis en direct", value: targets.filter((t) => presenceOf(t.lastSeenAt) === "online").length, icon: Radio, color: "text-amber-700 bg-amber-100" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Suivi terrain en direct</h1>
            <p className="text-sm text-gray-500">Position actuelle de tous les agents, ménages prioritaires enquêtés et bénéficiaires suivis.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/tracking/history" className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50">
              <History className="h-4 w-4" /> Historique des missions
            </Link>

            <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${connected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
              {connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              {connected ? "Temps réel actif" : "Hors connexion"}
            </span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {cards.map((card) => (
            <div key={card.label} className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className={`rounded-xl p-3 ${card.color}`}><card.icon className="h-5 w-5" /></div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex flex-wrap gap-4 px-2 text-sm text-gray-700">
              {([
                ["agents", "Agents (carré : vert = mission, orange = signal perdu)"],
                ["households", "Ménages prioritaires ≥ 70"],
                ["targets", "Bénéficiaires en direct (triangle)"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={layers[key]} onChange={(e) => setLayers({ ...layers, [key]: e.target.checked })} className="h-4 w-4" />
                  {label}
                </label>
              ))}
            </div>

            <GoogleMap markers={markers} lines={lines} route={route} onRouteInfo={setRouteInfo} height={600} selectedId={focusSurvey ? `sv-${focusSurvey}` : selected} onSelect={select} />

            <div className="mt-3 flex flex-wrap gap-4 px-2 text-xs text-gray-500">
              <span><i className="mr-1 inline-block h-3 w-3 rounded-sm bg-gray-900" /> Siège ONG</span>
              <span><i className="mr-1 inline-block h-3 w-3 rounded-sm bg-green-600" /> En mission</span>
              <span><i className="mr-1 inline-block h-3 w-3 rounded-sm bg-amber-500" /> Signal perdu</span>
              <span><i className="mr-1 inline-block h-3 w-3 rounded-full bg-red-600" /> Ménage ≥ 70</span>
              <span>Cliquez un agent : itinéraire (flèche bleue) du siège vers lui. Cliquez un ménage : fiche + flèche depuis l&apos;agent le plus proche.</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex gap-1 rounded-xl bg-gray-100 p-1 text-sm">
                {([
                  ["agents", `Agents (${agents.length})`],
                  ["households", `Prioritaires (${priority.length})`],
                  ["targets", `Suivis (${targets.length})`],
                ] as const).map(([key, label]) => (
                  <button key={key} type="button" onClick={() => setTab(key)} className={`flex-1 rounded-lg py-2 font-medium transition ${tab === key ? "bg-white text-blue-900 shadow" : "text-gray-600"}`}>
                    {label}
                  </button>
                ))}
              </div>

              {tab === "agents" && (
                <div className="mb-3 flex flex-wrap gap-2 text-xs">
                  {([["ALL", "Tous"], ["MISSION", "En mission"], ["ONLINE", "En ligne"], ["OFFLINE", "Hors ligne"]] as const).map(([key, label]) => (
                    <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-full border px-3 py-1 font-medium ${filter === key ? "border-blue-700 bg-blue-700 text-white" : "border-gray-200 bg-white text-gray-600"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              )}

              <div className="max-h-[360px] space-y-2 overflow-y-auto">
                {tab === "agents" && (filteredAgents.length === 0
                  ? <p className="py-8 text-center text-sm text-gray-500">Aucun agent dans cette catégorie.</p>
                  : filteredAgents.map((a) => (
                    <button key={a.id} type="button" onClick={() => select(`s-${a.id}`)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:bg-gray-50 ${selected === `s-${a.id}` ? "border-blue-400 bg-blue-50" : "border-gray-100"}`}>
                      <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: AGENT_COLOR[a.live] }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-gray-900">{a.name}</span>
                        <span className="block truncate text-xs text-gray-500">
                          {a.latitude !== null
                            ? `Alt. ${a.altitude !== null ? `${Math.round(a.altitude)} m` : "?"} · ${hqKm(a) !== null ? `${fmtKm(hqKm(a))} du siège · ` : ""}${ago(a.updatedAt)}`
                            : a.online ? "Connecté — GPS non partagé" : "Hors ligne"}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-[11px] font-semibold" style={{ color: AGENT_COLOR[a.live] }}>{AGENT_LABEL[a.live]}</span>
                        <span className="block text-[11px] text-gray-400">{a.surveysTotal} enquête(s)</span>
                      </span>
                    </button>
                  )))}

                {tab === "households" && (priority.length === 0
                  ? <p className="py-8 text-center text-sm text-gray-500">Aucun ménage prioritaire pour le moment (il faut des enquêtes réalisées par les agents en mission).</p>
                  : priority.map((h) => (
                    <button key={h.id} type="button" onClick={() => h.latitude !== null && select(`h-${h.id}`)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:bg-gray-50 ${selected === `h-${h.id}` ? "border-blue-400 bg-blue-50" : "border-gray-100"}`}>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: scoreColor(h.score) }}>{h.score}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-gray-900">{h.name}</span>
                        <span className="block truncate text-xs text-gray-500">{h.locality ?? h.zoneName ?? "Localité ?"} · {h.altitude !== null ? `${Math.round(h.altitude)} m` : "altitude ?"}{h.distanceToHqKm !== null ? ` · ${fmtKm(h.distanceToHqKm)} du siège` : ""}</span>
                      </span>
                    </button>
                  )))}

                {tab === "targets" && (targets.length === 0
                  ? <p className="py-8 text-center text-sm text-gray-500">Aucun bénéficiaire suivi.</p>
                  : targets.map((t) => {
                    const presence = presenceOf(t.lastSeenAt);
                    return (
                      <button key={t.id} type="button" onClick={() => select(`t-${t.id}`)} className="flex w-full items-center gap-3 rounded-xl border border-gray-100 p-3 text-left hover:bg-gray-50">
                        <span className="h-3 w-3 rounded-full" style={{ background: PRESENCE_COLOR[presence] }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-gray-900">{t.firstName} {t.lastName}</span>
                          <span className="block truncate text-xs text-gray-500">{t.project?.name ?? "Sans projet"}</span>
                        </span>
                        <span className="text-[11px] text-gray-400">{PRESENCE_LABEL[presence]}</span>
                      </button>
                    );
                  }))}
              </div>
            </div>

            {/* ------------------------- fiche agent ------------------------- */}
            {selectedAgent && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{selectedAgent.name}</p>
                    <p className="text-xs text-gray-500">{selectedAgent.department ?? selectedAgent.role}</p>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{ background: AGENT_COLOR[selectedAgent.live] }}>{AGENT_LABEL[selectedAgent.live]}</span>
                </div>

                <dl className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    ["Position actuelle", selectedAgent.latitude !== null ? `${selectedAgent.latitude.toFixed(5)}, ${(selectedAgent.longitude as number).toFixed(5)}` : "—"],
                    ["Altitude", selectedAgent.altitude !== null ? `${Math.round(selectedAgent.altitude)} m` : "—"],
                    ["Distance du siège", hqKm(selectedAgent) !== null ? `${fmtKm(hqKm(selectedAgent))} (à vol d'oiseau)` : "—"],
                    ["Dernier signal", ago(selectedAgent.updatedAt)],
                    ["Mission démarrée", selectedAgent.missionStartedAt ? fmtDateTime(selectedAgent.missionStartedAt) : "—"],
                    ["Enquêtes", `${selectedAgent.surveysToday} aujourd'hui · ${selectedAgent.surveysTotal} au total`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-2.5">
                      <dt className="text-[11px] text-gray-500">{label}</dt>
                      <dd className="font-medium text-gray-900">{value}</dd>
                    </div>
                  ))}
                </dl>

                {routeInfo && (
                  <p className="mt-3 flex items-start gap-2 rounded-xl bg-blue-50 p-2.5 text-sm text-blue-900">
                    <RouteIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      Trajet siège → <b>{selectedAgent.name}</b> : <b>{fmtKm(routeInfo.distanceKm)}</b>
                      {routeInfo.durationMin !== null ? ` · ≈ ${routeInfo.durationMin} min` : ""} {routeInfo.road ? "(par la route)" : "(ligne droite)"}
                    </span>
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  {selectedAgent.latitude !== null && (
                    <a href={directionsUrl({ latitude: selectedAgent.latitude, longitude: selectedAgent.longitude as number }, hq)} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-800 px-3 py-2 font-medium text-white hover:bg-blue-900">
                      <ExternalLink className="h-4 w-4" /> Itinéraire GPS
                    </a>
                  )}
                  <Link href={`/tracking/history?agent=${selectedAgent.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 font-medium text-gray-800 hover:bg-gray-50">
                    <History className="h-4 w-4" /> Historique
                  </Link>
                  {selectedAgent.phone && (
                    <a href={`tel:${selectedAgent.phone}`} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 font-medium text-gray-800 hover:bg-gray-50">
                      <Phone className="h-4 w-4" /> Appeler
                    </a>
                  )}
                </div>

                {/* Enquêtes réalisées par l'agent : un clic affiche toutes les réponses et centre la carte sur le ménage */}
                <div className="mt-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <ClipboardList className="h-4 w-4" /> Enquêtes réalisées ({agentSurveys.length})
                  </p>

                  {agentSurveys.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 p-3 text-center text-xs text-gray-500">Aucune enquête pour cet agent.</p>
                  ) : (
                    <div className="max-h-[420px] space-y-2 overflow-y-auto">
                      {agentSurveys.map((sv) => {
                        const open = openSurvey === sv.id;
                        const hasPoint = sv.latitude !== null && sv.longitude !== null;

                        return (
                          <div key={sv.id} className={`rounded-xl border ${open ? "border-blue-400 bg-blue-50/40" : "border-gray-100"}`}>
                            <button
                              type="button"
                              onClick={() => {
                                if (open) {
                                  setOpenSurvey(null);
                                  setFocusSurvey(null);
                                } else {
                                  setOpenSurvey(sv.id);
                                  setFocusSurvey(hasPoint ? sv.id : null);
                                }
                              }}
                              className="flex w-full items-center gap-3 p-3 text-left"
                            >
                              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: sv.vulnerable ? "#dc2626" : "#0d9488" }} />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-gray-900">{sv.beneficiaryName}</span>
                                <span className="block truncate text-xs text-gray-500">{fmtDateTime(sv.createdAt)}{sv.locality ? ` · ${sv.locality}` : ""}</span>
                              </span>
                              {sv.vulnerable && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">Vulnérable</span>}
                              <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition ${open ? "rotate-180" : ""}`} />
                            </button>

                            {open && (
                              <div className="space-y-2 px-3 pb-3">
                                <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white text-sm">
                                  {surveyRows(sv).map(([label, value]) => (
                                    <div key={label} className="flex justify-between gap-3 px-3 py-1.5">
                                      <span className="text-gray-500">{label}</span>
                                      <span className="font-medium text-gray-900">{value}</span>
                                    </div>
                                  ))}
                                </div>

                                <dl className="grid grid-cols-2 gap-2 text-sm">
                                  {[
                                    ["Altitude du ménage", sv.altitude !== null ? `${Math.round(sv.altitude)} m` : "—"],
                                    ["Distance du siège", hq && hasPoint ? fmtKm(Math.round(haversineKm(hq.latitude, hq.longitude, sv.latitude as number, sv.longitude as number) * 10) / 10) : "—"],
                                  ].map(([label, value]) => (
                                    <div key={label} className="rounded-xl bg-slate-50 p-2.5">
                                      <dt className="text-[11px] text-gray-500">{label}</dt>
                                      <dd className="font-medium text-gray-900">{value}</dd>
                                    </div>
                                  ))}
                                </dl>

                                {sv.notes && <p className="rounded-xl bg-amber-50 p-2.5 text-xs text-amber-900">{sv.notes}</p>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ------------------- fiche ménage prioritaire ------------------- */}
            {selectedHousehold && (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-2 font-semibold text-gray-900"><Home className="h-4 w-4" /> {selectedHousehold.name}</p>
                    <p className="text-xs text-gray-500">{selectedHousehold.projectName} · {selectedHousehold.locality ?? selectedHousehold.zoneName ?? "Localité non renseignée"}</p>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-xs font-bold text-white" style={{ background: scoreColor(selectedHousehold.score) }}>Score {selectedHousehold.score}</span>
                </div>

                <dl className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    ["Position", selectedHousehold.latitude !== null ? `${selectedHousehold.latitude.toFixed(5)}, ${(selectedHousehold.longitude as number).toFixed(5)}` : "—"],
                    ["Altitude", selectedHousehold.altitude !== null ? `${Math.round(selectedHousehold.altitude)} m` : "—"],
                    ["Distance du siège", fmtKm(selectedHousehold.distanceToHqKm)],
                    ["Agent le plus proche", nearestAgent ? `${nearestAgent.agent.name} · ${fmtKm(nearestAgent.km)}` : "Aucun agent localisé"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-2.5">
                      <dt className="flex items-center gap-1 text-[11px] text-gray-500">{label === "Altitude" && <Mountain className="h-3 w-3" />}{label}</dt>
                      <dd className="font-medium text-gray-900">{value}</dd>
                    </div>
                  ))}
                </dl>

                {selectedHousehold.lastSurvey && (
                  <div className="mt-3">
                    <p className="mb-2 text-sm font-semibold text-gray-900">
                      Réponses de l&apos;enquête
                      <span className="ml-2 text-xs font-normal text-gray-500">par {selectedHousehold.lastSurvey.agentName} · {fmtDateTime(selectedHousehold.lastSurvey.createdAt)}</span>
                    </p>

                    <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 text-sm">
                      {[
                        ["Taille du ménage", selectedHousehold.lastSurvey.householdSize ?? "—"],
                        ["Revenu mensuel", selectedHousehold.lastSurvey.monthlyIncome !== null ? `${selectedHousehold.lastSurvey.monthlyIncome.toLocaleString("fr-FR")} Ar` : "—"],
                        ["Enfants de moins de 5 ans", selectedHousehold.lastSurvey.childrenUnder5 ?? "—"],
                        ["Enfants non scolarisés", selectedHousehold.lastSurvey.outOfSchoolChildren ?? "—"],
                        ["Repas par jour", selectedHousehold.lastSurvey.mealsPerDay ?? "—"],
                        ["Handicap dans le ménage", yn(selectedHousehold.lastSurvey.hasDisability)],
                        ["Problèmes de santé", yn(selectedHousehold.lastSurvey.healthIssues)],
                        ["Accès à l'eau", yn(selectedHousehold.lastSurvey.waterAccess)],
                        ["Accès à l'électricité", yn(selectedHousehold.lastSurvey.electricityAccess)],
                        ["Type d'habitat", selectedHousehold.lastSurvey.housingType ?? "—"],
                        ["Jugé vulnérable par l'agent", yn(selectedHousehold.lastSurvey.vulnerable)],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="flex justify-between gap-3 px-3 py-1.5">
                          <span className="text-gray-500">{label}</span>
                          <span className="font-medium text-gray-900">{value}</span>
                        </div>
                      ))}
                    </div>

                    {selectedHousehold.lastSurvey.notes && <p className="mt-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-900">{selectedHousehold.lastSurvey.notes}</p>}
                  </div>
                )}

                {selectedHousehold.latitude !== null && (
                  <a href={directionsUrl({ latitude: selectedHousehold.latitude, longitude: selectedHousehold.longitude as number }, nearestAgent ? { latitude: nearestAgent.agent.latitude as number, longitude: nearestAgent.agent.longitude as number } : hq)}
                    target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-800 px-3 py-2 text-sm font-medium text-white hover:bg-blue-900">
                    <ExternalLink className="h-4 w-4" /> Itinéraire GPS vers le ménage
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
