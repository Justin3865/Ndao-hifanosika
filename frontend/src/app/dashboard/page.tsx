"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Briefcase,
  Building2,
  ClipboardList,
  GraduationCap,
  Heart,
  MapPin,
  Radio,
  Users,
} from "lucide-react";
import api from "@/lib/axios";
import { AppLayout } from "@/components/layout";
import { StatusBadge } from "@/components/crud/StatusBadge";
import { GoogleMap, MapMarker, MAPS_ENABLED } from "@/components/maps/GoogleMap";
import { getStoredRole } from "@/lib/access";
import { fmtDate } from "@/lib/crud";
import { roleLabel } from "@/lib/roles";
import {
  PRESENCE_COLOR,
  PRESENCE_LABEL,
  presenceOf,
  scoreColor,
  useHouseholds,
  useLiveStaff,
  useLiveTargets,
} from "@/lib/useLiveTargets";

interface DashboardData {
  totals: Record<string, number>;
  status: Record<string, number>;
}

interface Zone {
  city: string;
  latitude: number;
  longitude: number;
  activities: number;
  projects: number;
  beneficiaries: number;
}

interface Headquarters {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  latitude: number;
  longitude: number;
}

interface ConfiguredZone {
  id: number;
  name: string;
  region?: string | null;
  latitude: number;
  longitude: number;
}

/** Même taille pour tous les points de la carte (siège, zones, ménages, agents, bénéficiaires). */
const POINT_RADIUS = 9;

const DEFAULT_HQ_ADDRESS = "Lot 28TB/3609, Talatamaty Ambany, Fianarantsoa 301, Madagascar";

interface InternshipRow {
  id: number;
  title: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  student?: { firstName: string; lastName: string };
}

const REPORT_ROLES = ["ADMIN", "DIRECTION", "DAF", "RH", "COMMUNICATION", "COORDINATOR"];
const ZONE_ROLES = ["ADMIN", "DIRECTION", "DAF", "COMMUNICATION", "COORDINATOR"];
const TRACKING_ROLES = ["ADMIN", "DIRECTION", "COORDINATOR"];
const INTERNSHIP_ROLES = ["ADMIN", "RH", "COORDINATOR", "TUTEUR_L3", "TUTEUR_M2", "STAGIAIRE_L3", "STAGIAIRE_M2"];

const KPIS = [
  { key: "projects", label: "Projets", href: "/projects", icon: Briefcase, tone: "from-blue-600 to-blue-800" },
  { key: "activities", label: "Activités", href: "/activities", icon: Activity, tone: "from-sky-500 to-blue-700" },
  { key: "beneficiaries", label: "Bénéficiaires", href: "/beneficiaries", icon: Heart, tone: "from-rose-500 to-pink-700" },
  { key: "evaluations", label: "Évaluations", href: "/evaluations", icon: ClipboardList, tone: "from-emerald-500 to-teal-700" },
  { key: "internships", label: "Stages", href: "/internships", icon: GraduationCap, tone: "from-amber-400 to-orange-600" },
  { key: "users", label: "Utilisateurs", href: "/users", icon: Users, tone: "from-violet-500 to-purple-700" },
];

export default function DashboardPage() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [internships, setInternships] = useState<InternshipRow[]>([]);
  const [hq, setHq] = useState<Headquarters | null>(null);
  const [configuredZones, setConfiguredZones] = useState<ConfiguredZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTargets, setShowTargets] = useState(true);
  const [showHq, setShowHq] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showHouseholds, setShowHouseholds] = useState(true);
  const [showStaff, setShowStaff] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = getStoredRole();
    setRole(current);
    setReady(true);

    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "{}");
      setName(user.firstName ?? "");
    } catch {
      setName("");
    }

    const jobs: Promise<unknown>[] = [];

    if (REPORT_ROLES.includes(current)) {
      jobs.push(api.get("/reports/dashboard").then((r) => setData(r.data?.data ?? null)).catch(() => setData(null)));
    }

    // Siège + zones configurées : visibles par tous les utilisateurs
    jobs.push(
      api
        .get("/public/organization")
        .then((r) => {
          const org = r.data?.data;
          const head = org?.headquarters;
          setHq(head && Number.isFinite(Number(head.latitude)) && Number.isFinite(Number(head.longitude)) ? { ...head, latitude: Number(head.latitude), longitude: Number(head.longitude) } : null);
          setConfiguredZones(Array.isArray(org?.zones) ? org.zones : []);
        })
        .catch(() => {
          setHq(null);
          setConfiguredZones([]);
        }),
    );

    if (ZONE_ROLES.includes(current)) {
      jobs.push(api.get("/tracking/zones").then((r) => setZones(r.data?.data ?? [])).catch(() => setZones([])));
    }

    if (INTERNSHIP_ROLES.includes(current)) {
      jobs.push(
        api
          .get("/internships")
          .then((r) => setInternships((r.data?.data ?? []).slice(0, 5)))
          .catch(() => setInternships([]))
      );
    }

    Promise.all(jobs).finally(() => setLoading(false));
  }, []);

  const canTrack = ready && TRACKING_ROLES.includes(role);
  const { targets, connected } = useLiveTargets(canTrack);
  const staff = useLiveStaff(canTrack);
  const { households } = useHouseholds(canTrack);

  const markers: MapMarker[] = useMemo(() => {
    const hqMarkers: MapMarker[] =
      showHq && hq
        ? [
            {
              id: "hq",
              latitude: hq.latitude,
              longitude: hq.longitude,
              title: `Siège : ${hq.name}`,
              color: "#111827",
              shape: "square" as const,
              radius: POINT_RADIUS,
              info: [hq.address ?? DEFAULT_HQ_ADDRESS, hq.phone, hq.email].filter(Boolean).join("\n"),
            },
          ]
        : [];

    const zoneMarkers: MapMarker[] = showZones
      ? zones.map((zone) => ({
          id: `zone-${zone.city}`,
          latitude: zone.latitude,
          longitude: zone.longitude,
          title: zone.city,
          color: "#1d4ed8",
          radius: POINT_RADIUS,
          info: `${zone.projects} projet(s) · ${zone.activities} activité(s) · ${zone.beneficiaries} bénéficiaire(s)`,
        }))
      : [];

    // Zones d'intervention définies par l'administration (hors doublons avec les villes d'activité)
    const known = new Set(zones.map((z) => z.city.trim().toLowerCase()));
    const declaredMarkers: MapMarker[] = showZones
      ? configuredZones
          .filter((z) => !known.has(z.name.trim().toLowerCase()))
          .filter((z) => !(hq && Math.abs(z.latitude - hq.latitude) < 1e-6 && Math.abs(z.longitude - hq.longitude) < 1e-6))
          .map((z) => ({
            id: `cfg-${z.id}`,
            latitude: z.latitude,
            longitude: z.longitude,
            title: z.name,
            color: "#60a5fa",
            radius: POINT_RADIUS,
            info: z.region ? `Zone d'intervention — ${z.region}` : "Zone d'intervention",
          }))
      : [];

    const targetMarkers: MapMarker[] =
      canTrack && showTargets
        ? targets
            .filter((t) => t.latitude !== null && t.longitude !== null)
            .map((t) => ({
              id: `target-${t.id}`,
              latitude: t.latitude as number,
              longitude: t.longitude as number,
              title: `${t.firstName} ${t.lastName}`,
              color: PRESENCE_COLOR[presenceOf(t.lastSeenAt)],
              radius: POINT_RADIUS,
              info: `${t.project?.name ?? ""} — ${PRESENCE_LABEL[presenceOf(t.lastSeenAt)]}`,
            }))
        : [];

    const staffMarkers: MapMarker[] =
      canTrack && showStaff
        ? staff.map((s) => ({
            id: `staff-${s.id}`,
            latitude: s.latitude,
            longitude: s.longitude,
            title: `Agent : ${s.name}`,
            color: "#1d4ed8",
            shape: "square" as const,
            radius: POINT_RADIUS,
            info: `Altitude ${s.altitude !== null ? Math.round(s.altitude) : "?"} m`,
          }))
        : [];

    const householdMarkers: MapMarker[] =
      canTrack && showHouseholds
        ? households
            .filter((h) => h.latitude !== null && h.longitude !== null && (h.vulnerable || h.score >= 50))
            .map((h) => ({
              id: `home-${h.id}`,
              latitude: h.latitude as number,
              longitude: h.longitude as number,
              title: h.name,
              color: scoreColor(h.score),
              radius: POINT_RADIUS,
              info: `${h.locality ?? ""} — score ${h.score}/100 · altitude ${h.altitude ?? "?"} m`,
            }))
        : [];

    return [...zoneMarkers, ...declaredMarkers, ...householdMarkers, ...staffMarkers, ...targetMarkers, ...hqMarkers];
  }, [zones, configuredZones, hq, targets, staff, households, canTrack, showTargets, showHq, showZones, showHouseholds, showStaff]);

  const hqAddress = hq?.address || DEFAULT_HQ_ADDRESS;
  const hqLink = hq
    ? `https://www.google.com/maps/search/?api=1&query=${hq.latitude},${hq.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`ONG Ndao Hifanosika, ${DEFAULT_HQ_ADDRESS}`)}`;

  const online = targets.filter((t) => presenceOf(t.lastSeenAt) === "online").length;
  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const maxTotal = Math.max(
    1,
    ...Object.values((data?.totals ?? {}) as Record<string, number>)
  );

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* ---------- Bandeau d'accueil ---------- */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-950 via-blue-900 to-blue-700 p-4 text-white shadow-md sm:p-5">
          <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-amber-400/25 blur-3xl" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "24px 24px" }}
          />

          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm capitalize text-blue-200">{today}</p>
              <h1 className="mt-1 text-2xl font-bold md:text-3xl">
                Bonjour{name ? `, ${name}` : ""} 👋
              </h1>
              <p className="mt-1 max-w-xl text-sm text-blue-100">
                Voici l&apos;impact de Ndao Hifanosika en un coup d&apos;œil — projets, jeunes accompagnés et présence sur le terrain.
              </p>
              <span className="mt-2 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/20">
                {roleLabel(role)}
              </span>
            </div>

            {canTrack && (
              <Link
                href="/tracking"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20"
              >
                <span className="relative flex h-3 w-3">
                  <span className={`absolute inline-flex h-full w-full rounded-full ${connected ? "animate-ping bg-green-400" : "bg-gray-400"} opacity-75`} />
                  <span className={`relative inline-flex h-3 w-3 rounded-full ${connected ? "bg-green-400" : "bg-gray-400"}`} />
                </span>
                <span>
                  <span className="block text-2xl font-bold leading-none">{online}</span>
                  <span className="text-xs text-blue-100">bénéficiaire(s) en ligne</span>
                </span>
                <ArrowUpRight className="h-5 w-5 text-amber-300" />
              </Link>
            )}
          </div>
        </section>

        {loading && <p className="text-gray-500">Chargement...</p>}

        {/* ---------- Indicateurs ---------- */}
        {data && (
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {KPIS.map((kpi) => (
              <Link
                key={kpi.key}
                href={kpi.href}
                className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className={`mb-2 inline-flex rounded-lg bg-gradient-to-br p-2 text-white shadow-md ${kpi.tone}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{data.totals?.[kpi.key] ?? 0}</p>
                <p className="text-sm text-gray-500">{kpi.label}</p>
              </Link>
            ))}
          </section>
        )}

        {/* ---------- Carte unique : siège, zones d'intervention, terrain + répartition ---------- */}
        <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3 px-2">
              <div className="flex min-w-0 items-start gap-3">
                <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900">Carte de l&apos;ONG Ndao Hifanosika</h2>
                  <p className="text-xs text-gray-500">Siège, zones d&apos;intervention et présence sur le terrain</p>
                  <p className="mt-1 text-sm text-gray-600">
                    <span className="font-medium text-gray-800">Siège :</span> {hqAddress}
                  </p>
                </div>
              </div>

              <a
                href={hqLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
              >
                <MapPin className="h-4 w-4" />
                Ouvrir dans Google Maps
              </a>
            </div>

            {/* Couches affichées sur la carte */}
            <div className="mb-3 flex flex-wrap gap-2 px-2 text-sm text-gray-600">
              <label className="flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-3 py-1">
                <input type="checkbox" checked={showHq} onChange={(e) => setShowHq(e.target.checked)} className="h-4 w-4" />
                Siège
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-3 py-1">
                <input type="checkbox" checked={showZones} onChange={(e) => setShowZones(e.target.checked)} className="h-4 w-4" />
                Zones d&apos;intervention
              </label>
              {canTrack && (
                <>
                  <label className="flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-3 py-1">
                    <input type="checkbox" checked={showHouseholds} onChange={(e) => setShowHouseholds(e.target.checked)} className="h-4 w-4" />
                    Ménages vulnérables
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-3 py-1">
                    <input type="checkbox" checked={showStaff} onChange={(e) => setShowStaff(e.target.checked)} className="h-4 w-4" />
                    Agents en mission
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 px-3 py-1">
                    <input type="checkbox" checked={showTargets} onChange={(e) => setShowTargets(e.target.checked)} className="h-4 w-4" />
                    <Radio className="h-4 w-4 text-green-600" /> Bénéficiaires en direct
                  </label>
                </>
              )}
            </div>

            {loading ? (
              <div className="flex h-[460px] items-center justify-center rounded-2xl bg-gray-50 text-sm text-gray-500">Chargement de la carte…</div>
            ) : MAPS_ENABLED ? (
              <GoogleMap markers={markers} height={460} />
            ) : (
              <iframe
                title="Localisation du siège de l'ONG Ndao Hifanosika"
                src={`https://maps.google.com/maps?q=${hq ? `${hq.latitude},${hq.longitude}` : encodeURIComponent(`ONG Ndao Hifanosika, ${DEFAULT_HQ_ADDRESS}`)}&output=embed`}
                className="block h-[460px] w-full rounded-2xl"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            )}

            <div className="mt-3 flex flex-wrap gap-4 px-2 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-gray-900" /> Siège ONG</span>
              <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-blue-700" /> Zone d&apos;intervention</span>
              {canTrack && (
                <>
                  <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-red-600" /> Ménage vulnérable</span>
                  <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-sm bg-blue-700" /> Agent en mission</span>
                  <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-green-600" /> En ligne</span>
                  <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-amber-500" /> Vu récemment</span>
                  <span className="flex items-center gap-1.5"><i className="h-3 w-3 rounded-full bg-gray-400" /> Hors ligne</span>
                </>
              )}
            </div>
          </div>

            <div className="space-y-4">
              {zones.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-4 font-semibold text-gray-900">Par ville</h3>
                  <div className="space-y-4">
                    {zones.map((zone) => (
                      <div key={zone.city}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="font-medium text-gray-800">{zone.city}</span>
                          <span className="text-gray-500">{zone.beneficiaries} bénéf.</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-amber-400"
                            style={{ width: `${Math.min(100, zone.activities * 12)}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{zone.projects} projet(s) · {zone.activities} activité(s)</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data && (
                <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 font-semibold text-gray-900">Volume par module</h3>
                  <div className="space-y-3">
                    {KPIS.map((kpi) => (
                      <div key={kpi.key} className="flex items-center gap-3 text-sm">
                        <span className="w-24 text-gray-600">{kpi.label}</span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${kpi.tone}`}
                            style={{ width: `${((data.totals?.[kpi.key] ?? 0) / maxTotal) * 100}%` }}
                          />
                        </div>
                        <span className="w-8 text-right font-semibold text-gray-800">{data.totals?.[kpi.key] ?? 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

        {/* ---------- Stages ---------- */}
        {internships.length > 0 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {role.startsWith("STAGIAIRE_") ? "Mon stage" : "Stages récents"}
              </h2>
              <Link href="/internships" className="text-sm font-medium text-blue-700 hover:underline">Tout voir</Link>
            </div>

            <div className="divide-y divide-gray-100">
              {internships.map((internship) => (
                <Link
                  key={internship.id}
                  href={`/internships/${internship.id}`}
                  className="flex items-center justify-between gap-4 py-3 text-sm hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900">{internship.title}</p>
                    <p className="text-gray-500">
                      {internship.student ? `${internship.student.firstName} ${internship.student.lastName}` : "—"} ·{" "}
                      {fmtDate(internship.startDate)} → {fmtDate(internship.endDate)}
                    </p>
                  </div>
                  <StatusBadge status={internship.status} />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
