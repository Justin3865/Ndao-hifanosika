"use client";

import { useEffect, useMemo, useState } from "react";
import { Navigation, Radio, Users, Wifi, WifiOff } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { GoogleMap, MapLine, MapMarker } from "@/components/maps/GoogleMap";
import {
  PRESENCE_COLOR,
  PRESENCE_LABEL,
  presenceOf,
  scoreColor,
  useHouseholds,
  useLiveStaff,
  useLiveTargets,
} from "@/lib/useLiveTargets";
import { fmtDateTime } from "@/lib/crud";

type Tab = "households" | "staff" | "targets";

export default function TrackingPage() {
  const { targets, connected } = useLiveTargets(true);
  const staff = useLiveStaff(true);
  const { households } = useHouseholds(true);

  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("households");
  const [layers, setLayers] = useState({ households: true, staff: true, targets: true });
  const [, tick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => tick((n) => n + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const located = households.filter((h) => h.latitude !== null && h.longitude !== null);

  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = [];

    if (layers.households) {
      located.forEach((h) =>
        list.push({
          id: `h-${h.id}`,
          latitude: h.latitude as number,
          longitude: h.longitude as number,
          title: h.name,
          color: scoreColor(h.score),
          radius: 8 + Math.round(h.score / 12),
          info: `${h.locality ?? h.zoneName ?? ""} — score ${h.score}/100 · altitude ${h.altitude ?? "?"} m${h.nearestStaff ? ` · agent le plus proche : ${h.nearestStaff.name} (${h.nearestStaff.distanceKm} km)` : ""}`,
        })
      );
    }

    if (layers.staff) {
      staff.forEach((s) =>
        list.push({
          id: `s-${s.id}`,
          latitude: s.latitude,
          longitude: s.longitude,
          title: `Agent : ${s.name}`,
          color: "#1d4ed8",
          shape: "square",
          radius: 9,
          info: `Altitude ${s.altitude !== null ? Math.round(s.altitude) : "?"} m — mis à jour ${fmtDateTime(s.updatedAt)}`,
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
  }, [layers, households, staff, targets]);

  // Lien agent -> ménage sélectionné
  const lines: MapLine[] = useMemo(() => {
    if (!selected?.startsWith("h-")) return [];

    const h = located.find((x) => `h-${x.id}` === selected);
    const agent = h?.nearestStaff ? staff.find((s) => s.id === h.nearestStaff?.id) : null;

    if (!h || !agent) return [];

    return [
      {
        id: "nearest",
        from: { latitude: agent.latitude, longitude: agent.longitude },
        to: { latitude: h.latitude as number, longitude: h.longitude as number },
        label: `${h.nearestStaff?.distanceKm} km`,
      },
    ];
  }, [selected, located, staff]);

  const online = targets.filter((t) => presenceOf(t.lastSeenAt) === "online").length;
  const urgent = households.filter((h) => h.score >= 70).length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Suivi terrain en direct</h1>
            <p className="text-sm text-gray-500">Ménages vulnérables, agents en mission (GPS) et bénéficiaires ayant accepté le suivi.</p>
          </div>

          <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${connected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
            {connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {connected ? "Temps réel actif" : "Hors connexion"}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Ménages prioritaires (≥ 70)", value: urgent, icon: Users, color: "text-red-700 bg-red-100" },
            { label: "Agents en mission", value: staff.length, icon: Navigation, color: "text-blue-700 bg-blue-100" },
            { label: "Bénéficiaires suivis", value: targets.length, icon: Radio, color: "text-amber-700 bg-amber-100" },
            { label: "En ligne maintenant", value: online, icon: Wifi, color: "text-green-700 bg-green-100" },
          ].map((card) => (
            <div key={card.label} className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className={`rounded-xl p-3 ${card.color}`}><card.icon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex flex-wrap gap-4 px-2 text-sm text-gray-700">
              {([
                ["households", "Ménages (couleur = score)"],
                ["staff", "Agents (carré bleu)"],
                ["targets", "Bénéficiaires en direct (triangle)"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={layers[key]} onChange={(e) => setLayers({ ...layers, [key]: e.target.checked })} className="h-4 w-4" />
                  {label}
                </label>
              ))}
            </div>

            <GoogleMap markers={markers} lines={lines} height={560} selectedId={selected} onSelect={setSelected} />

            <div className="mt-3 flex flex-wrap gap-4 px-2 text-xs text-gray-500">
              <span><i className="mr-1 inline-block h-3 w-3 rounded-full bg-red-600" /> ≥ 70</span>
              <span><i className="mr-1 inline-block h-3 w-3 rounded-full bg-orange-500" /> 50–69</span>
              <span><i className="mr-1 inline-block h-3 w-3 rounded-full bg-yellow-500" /> 30–49</span>
              <span><i className="mr-1 inline-block h-3 w-3 rounded-full bg-gray-500" /> &lt; 30</span>
              <span>Cliquez un ménage : ligne vers l&apos;agent le plus proche.</span>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex gap-1 rounded-xl bg-gray-100 p-1 text-sm">
              {([
                ["households", "Ménages"],
                ["staff", "Agents"],
                ["targets", "Suivis"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`flex-1 rounded-lg py-2 font-medium transition ${tab === key ? "bg-white text-blue-900 shadow" : "text-gray-600"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="max-h-[560px] space-y-2 overflow-y-auto">
              {tab === "households" &&
                households.slice(0, 40).map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => h.latitude !== null && setSelected(`h-${h.id}`)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:bg-gray-50 ${selected === `h-${h.id}` ? "border-blue-400 bg-blue-50" : "border-gray-100"}`}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: scoreColor(h.score) }}>
                      {h.score}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-900">
                        {h.name} {h.suspected && <span className="ml-1 rounded bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-800">À vérifier</span>}
                      </span>
                      <span className="block truncate text-xs text-gray-500">
                        {h.locality ?? h.zoneName ?? "Localité ?"} · {h.altitude !== null ? `${h.altitude} m` : "altitude ?"}
                        {h.nearestStaff ? ` · agent ${h.nearestStaff.distanceKm} km` : ""}
                      </span>
                    </span>
                  </button>
                ))}

              {tab === "staff" && (staff.length === 0
                ? <p className="py-8 text-center text-sm text-gray-500">Aucun agent ne partage sa position.</p>
                : staff.map((s) => (
                  <button key={s.id} type="button" onClick={() => setSelected(`s-${s.id}`)} className="flex w-full items-center gap-3 rounded-xl border border-gray-100 p-3 text-left hover:bg-gray-50">
                    <span className="h-3 w-3 rounded-sm bg-blue-700" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-900">{s.name}</span>
                      <span className="block text-xs text-gray-500">Altitude {s.altitude !== null ? `${Math.round(s.altitude)} m` : "?"} · {fmtDateTime(s.updatedAt)}</span>
                    </span>
                  </button>
                )))}

              {tab === "targets" && (targets.length === 0
                ? <p className="py-8 text-center text-sm text-gray-500">Aucun bénéficiaire suivi.</p>
                : targets.map((t) => {
                  const presence = presenceOf(t.lastSeenAt);
                  return (
                    <button key={t.id} type="button" onClick={() => setSelected(`t-${t.id}`)} className="flex w-full items-center gap-3 rounded-xl border border-gray-100 p-3 text-left hover:bg-gray-50">
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
        </div>
      </div>
    </AppLayout>
  );
}