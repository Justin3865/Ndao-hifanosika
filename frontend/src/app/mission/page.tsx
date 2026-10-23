"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, MapPin, Navigation, Search, ShieldCheck, StopCircle } from "lucide-react";
import api from "@/lib/axios";
import { AppLayout } from "@/components/layout";
import { GoogleMap, MapLine, MapMarker } from "@/components/maps/GoogleMap";
import { useMission } from "@/components/mission/MissionProvider";
import { toast } from "@/lib/toast";
import { errorMessage } from "@/lib/crud";
import { haversineKm, fmtKm } from "@/lib/geo";
import { scoreColor, useHouseholds } from "@/lib/useLiveTargets";
import { getStoredRole } from "@/lib/access";

const FIELD_ROLES = ["ADMIN", "DIRECTION", "COORDINATOR"];

interface SurveyTarget {
  id: number;
  name: string;
  projectName: string | null;
  surveyed: boolean;
}

const EMPTY_FORM = {
  householdSize: "",
  monthlyIncome: "",
  childrenUnder5: "",
  outOfSchoolChildren: "",
  mealsPerDay: "",
  housingType: "",
  hasDisability: false,
  healthIssues: false,
  waterAccess: true,
  electricityAccess: false,
  vulnerable: false,
  notes: "",
};

export default function MissionPage() {
  const { active, startedAt, position, lastSent, error, busy, start, finish } = useMission();

  const [role, setRole] = useState("");
  useEffect(() => setRole(getStoredRole()), []);

  const canSeeHouseholds = FIELD_ROLES.includes(role);
  const { households } = useHouseholds(canSeeHouseholds);

  /* ---------------------------- enquête ménage ---------------------------- */

  const [query, setQuery] = useState("");
  const [targets, setTargets] = useState<SurveyTarget[]>([]);
  const [chosen, setChosen] = useState<SurveyTarget | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!active) return;

    const timer = window.setTimeout(() => {
      api
        .get("/tracking/survey-targets", { params: { q: query } })
        .then((res) => setTargets(res.data?.data ?? []))
        .catch(() => setTargets([]));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query, active]);

  const submitSurvey = async () => {
    if (!chosen) return;

    setSaving(true);
    setFormError("");

    try {
      await api.post("/tracking/surveys", {
        beneficiaryId: chosen.id,
        // Position de l'agent = position du ménage
        latitude: position?.latitude,
        longitude: position?.longitude,
        altitude: position?.altitude,
        ...form,
        householdSize: form.householdSize === "" ? null : Number(form.householdSize),
        monthlyIncome: form.monthlyIncome === "" ? null : Number(form.monthlyIncome),
        childrenUnder5: form.childrenUnder5 === "" ? null : Number(form.childrenUnder5),
        outOfSchoolChildren: form.outOfSchoolChildren === "" ? null : Number(form.outOfSchoolChildren),
        mealsPerDay: form.mealsPerDay === "" ? null : Number(form.mealsPerDay),
      });

      toast.success(`Enquête enregistrée : ${chosen.name}`);
      setTargets((cur) => cur.map((t) => (t.id === chosen.id ? { ...t, surveyed: true } : t)));
      setChosen(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(errorMessage(err, "Enregistrement impossible."));
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------ ménages prioritaires proches ------------------------ */

  const nearby = useMemo(() => {
    if (!position) return [];

    return households
      .filter((h) => h.latitude !== null && h.longitude !== null && h.score >= 70)
      .map((h) => ({ h, distance: haversineKm(position.latitude, position.longitude, h.latitude as number, h.longitude as number) }))
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
      info: `${h.locality ?? ""} — score ${h.score} — ${fmtKm(distance)} — altitude ${h.altitude ?? "?"} m`,
    }));

    if (position) {
      list.push({ id: "me", latitude: position.latitude, longitude: position.longitude, title: "Moi", color: "#1d4ed8", shape: "square", radius: 10 });
    }

    return list;
  }, [nearby, position]);

  const lines: MapLine[] = useMemo(
    () =>
      position && nearby[0]
        ? [{
            id: "l",
            from: { latitude: position.latitude, longitude: position.longitude },
            to: { latitude: nearby[0].h.latitude as number, longitude: nearby[0].h.longitude as number },
            label: fmtKm(nearby[0].distance),
            arrow: true,
          }]
        : [],
    [position, nearby]
  );

  const num = (key: keyof typeof EMPTY_FORM, label: string, max = 99) => (
    <label className="block text-sm">
      <span className="mb-1 block text-gray-600">{label}</span>
      <input
        type="number"
        min={0}
        max={max}
        value={form[key] as string}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full rounded-xl border border-gray-300 px-3 py-2"
      />
    </label>
  );

  const check = (key: "hasDisability" | "healthIssues" | "waterAccess" | "electricityAccess" | "vulnerable", label: string) => (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
      <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="h-4 w-4" />
      {label}
    </label>
  );

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ma mission terrain</h1>
          <p className="text-sm text-gray-500">Partagez votre position GPS (avec altitude) pendant vos déplacements et réalisez vos enquêtes.</p>
        </div>

        <div className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Votre position n&apos;est partagée que pendant la mission, visible uniquement de la direction et des coordinateurs. La mission continue
            quand vous changez de page ou de menu : <b>elle ne s&apos;arrête que lorsque vous appuyez sur « Terminer la mission »</b>. Le trajet est
            conservé 90 jours dans l&apos;historique des missions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${active ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}>
            <Navigation className="h-7 w-7" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900">{active ? "Mission en cours — position partagée" : "Position non partagée"}</p>
            {active && startedAt && <p className="text-xs text-gray-500">Démarrée le {new Date(startedAt).toLocaleString("fr-FR")}</p>}
            {position && (
              <p className="text-sm text-gray-500">
                {position.latitude.toFixed(5)}, {position.longitude.toFixed(5)} · altitude {position.altitude !== null ? `${Math.round(position.altitude)} m` : "calculée par le serveur"} · précision ≈ {position.accuracy} m
                {lastSent ? ` · envoi ${lastSent.toLocaleTimeString("fr-FR")}` : ""}
              </p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          {active ? (
            <button type="button" disabled={busy} onClick={() => void finish()} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-60">
              <StopCircle className="h-5 w-5" /> Terminer la mission
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={() => void start()} className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-5 py-3 font-semibold text-white hover:bg-blue-900 disabled:opacity-60">
              <MapPin className="h-5 w-5" /> {busy ? "Recherche du GPS…" : "Démarrer la mission"}
            </button>
          )}
        </div>

        {active && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-1 flex items-center gap-2 font-semibold text-gray-900"><ClipboardList className="h-5 w-5 text-blue-800" /> Enquête ménage</h2>
            <p className="mb-4 text-xs text-gray-500">
              La position et l&apos;altitude relevées sont celles du ménage visité. Ces enquêtes servent à l&apos;entraînement du modèle de vulnérabilité.
            </p>

            {!chosen ? (
              <>
                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Rechercher un bénéficiaire / ménage…"
                    className="w-full rounded-xl border border-gray-300 py-2.5 pl-9 pr-3 text-sm"
                  />
                </div>

                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {targets.length === 0 && <p className="py-4 text-center text-sm text-gray-500">Aucun bénéficiaire trouvé.</p>}
                  {targets.map((t) => (
                    <button key={t.id} type="button" onClick={() => setChosen(t)} className="flex w-full items-center justify-between rounded-xl border border-gray-100 p-3 text-left hover:bg-gray-50">
                      <span>
                        <span className="block text-sm font-semibold text-gray-900">{t.name}</span>
                        <span className="block text-xs text-gray-500">{t.projectName ?? "Sans projet"}</span>
                      </span>
                      {t.surveyed && <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle2 className="h-4 w-4" /> Déjà enquêté</span>}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <p className="font-semibold text-gray-900">{chosen.name}</p>
                  <button type="button" onClick={() => setChosen(null)} className="text-sm text-blue-800 hover:underline">Changer</button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {num("householdSize", "Taille du ménage", 100)}
                  {num("monthlyIncome", "Revenu mensuel (Ar)", 100000000)}
                  {num("childrenUnder5", "Enfants de moins de 5 ans", 50)}
                  {num("outOfSchoolChildren", "Enfants non scolarisés", 50)}
                  {num("mealsPerDay", "Repas par jour", 10)}
                  <label className="block text-sm">
                    <span className="mb-1 block text-gray-600">Type d&apos;habitat</span>
                    <select value={form.housingType} onChange={(e) => setForm({ ...form, housingType: e.target.value })} className="w-full rounded-xl border border-gray-300 px-3 py-2">
                      <option value="">—</option>
                      <option value="Dur (briques / béton)">Dur (briques / béton)</option>
                      <option value="Semi-dur">Semi-dur</option>
                      <option value="Traditionnel (terre / bois)">Traditionnel (terre / bois)</option>
                      <option value="Précaire">Précaire</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {check("hasDisability", "Une personne en situation de handicap")}
                  {check("healthIssues", "Problèmes de santé dans le ménage")}
                  {check("waterAccess", "Accès à l'eau potable")}
                  {check("electricityAccess", "Accès à l'électricité")}
                  {check("vulnerable", "Ménage jugé vulnérable par l'agent")}
                </div>

                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Observations (facultatif)"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                />

                {formError && <p className="text-sm text-red-600">{formError}</p>}

                <button type="button" disabled={saving || !position} onClick={() => void submitSurvey()} className="rounded-xl bg-blue-800 px-5 py-2.5 font-semibold text-white hover:bg-blue-900 disabled:opacity-60">
                  {saving ? "Enregistrement…" : position ? "Enregistrer l'enquête" : "En attente du signal GPS…"}
                </button>
              </div>
            )}
          </div>
        )}

        {canSeeHouseholds && position && (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
              <GoogleMap markers={markers} lines={lines} height={420} refit />
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 font-semibold text-gray-900">Ménages prioritaires proches (≥ 70)</h2>
              <div className="space-y-2">
                {nearby.length === 0 && <p className="text-sm text-gray-500">Aucun ménage prioritaire géolocalisé à proximité.</p>}
                {nearby.map(({ h, distance }) => (
                  <div key={h.id} className="rounded-xl border border-gray-100 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">{h.name}</p>
                      <span className="rounded-full px-2 py-0.5 text-xs font-bold text-white" style={{ background: scoreColor(h.score) }}>{h.score}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {h.locality ?? h.zoneName ?? "—"} · {fmtKm(distance)} · altitude {h.altitude ?? "?"} m
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
