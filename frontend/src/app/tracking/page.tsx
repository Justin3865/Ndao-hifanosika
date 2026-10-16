"use client";

import { useEffect, useMemo, useState } from "react";
import { Radio, Users, Wifi, WifiOff } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { GoogleMap, MapMarker } from "@/components/maps/GoogleMap";
import {
  PRESENCE_COLOR,
  PRESENCE_LABEL,
  presenceOf,
  useLiveTargets,
} from "@/lib/useLiveTargets";
import { fmtDateTime } from "@/lib/crud";

export default function TrackingPage() {
  const { targets, loading, connected } = useLiveTargets(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "online">("all");
  const [, tick] = useState(0);

  // Rafraîchit les pastilles « en ligne / hors ligne » chaque 30 s
  useEffect(() => {
    const timer = window.setInterval(() => tick((n) => n + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const located = targets.filter((t) => t.latitude !== null && t.longitude !== null);

  const markers: MapMarker[] = useMemo(
    () =>
      located.map((t) => ({
        id: String(t.id),
        latitude: t.latitude as number,
        longitude: t.longitude as number,
        title: `${t.firstName} ${t.lastName}`,
        color: PRESENCE_COLOR[presenceOf(t.lastSeenAt)],
        radius: 10,
        info: `${t.project?.name ?? "Sans projet"} — ${PRESENCE_LABEL[presenceOf(t.lastSeenAt)]}`,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [targets]
  );

  const online = located.filter((t) => presenceOf(t.lastSeenAt) === "online").length;

  const list = targets.filter((t) =>
    filter === "online" ? presenceOf(t.lastSeenAt) === "online" : true
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Suivi terrain en direct</h1>
            <p className="text-sm text-gray-500">
              Bénéficiaires ayant accepté de partager leur position (WebSocket).
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${
              connected ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            {connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {connected ? "Temps réel actif" : "Hors connexion"}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Suivis", value: targets.length, icon: Users, color: "text-blue-700 bg-blue-100" },
            { label: "En ligne maintenant", value: online, icon: Radio, color: "text-green-700 bg-green-100" },
            { label: "Positionnés sur la carte", value: located.length, icon: Wifi, color: "text-amber-700 bg-amber-100" },
          ].map((card) => (
            <div key={card.label} className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className={`rounded-xl p-3 ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            <GoogleMap
              markers={markers}
              height={560}
              selectedId={selected}
              onSelect={setSelected}
            />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Bénéficiaires</h2>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as "all" | "online")}
                className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
              >
                <option value="all">Tous</option>
                <option value="online">En ligne</option>
              </select>
            </div>

            {loading && <p className="text-sm text-gray-500">Chargement...</p>}

            {!loading && list.length === 0 && (
              <p className="py-8 text-center text-sm text-gray-500">
                Aucun bénéficiaire suivi. Générez un lien depuis la fiche d&apos;un bénéficiaire.
              </p>
            )}

            <div className="max-h-[480px] space-y-2 overflow-y-auto">
              {list.map((t) => {
                const presence = presenceOf(t.lastSeenAt);

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelected(String(t.id))}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:bg-gray-50 ${
                      selected === String(t.id) ? "border-blue-400 bg-blue-50" : "border-gray-100"
                    }`}
                  >
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: PRESENCE_COLOR[presence] }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-900">
                        {t.firstName} {t.lastName}
                      </span>
                      <span className="block truncate text-xs text-gray-500">{t.project?.name ?? "Sans projet"}</span>
                    </span>
                    <span className="text-right text-[11px] text-gray-400">
                      {PRESENCE_LABEL[presence]}
                      <br />
                      {t.lastSeenAt ? fmtDateTime(t.lastSeenAt) : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
