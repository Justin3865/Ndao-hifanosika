"use client";

import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import api from "@/lib/axios";
import { errorMessage } from "@/lib/crud";
import { toast } from "@/lib/toast";
import type { MissionPosition } from "@/components/mission/MissionProvider";
import type { EnrollmentOverview, ProjectQuota } from "@/lib/enrollment";
import { EntityMatriculeField } from "@/components/crud/EntityMatriculeField";
import { BeneficiaryLocationField } from "@/components/beneficiaries/BeneficiaryLocationField";
import { DISABILITY_OPTIONS, PERSON_EMAIL_DOMAINS, cinSexProblem, emailProblem, householdProblem, phoneProblem } from "@/lib/validation";
import { cinPrefixError } from "@/lib/cin";

type Values = Record<string, string | boolean>;

/** Mêmes champs que le formulaire « Ajouter un bénéficiaire » (+ les questions propres à l'enquête). */
const EMPTY: Values = {
  matricule: "",
  firstName: "",
  lastName: "",
  gender: "",
  birthDate: "",
  age: "",
  birthPlace: "",
  phone: "",
  email: "",
  cinNumber: "",
  cinIssuedAt: "",
  cinIssuedPlace: "",
  cinDuplicata: false,
  projectId: "",
  householdSize: "",
  monthlyIncome: "",
  childrenUnder5: "",
  hasDisability: false,
  disabilityTypes: "",
  outOfSchoolChildren: "",
  mealsPerDay: "",
  housingType: "",
  healthIssues: false,
  waterAccess: true,
  electricityAccess: false,
  vulnerable: false,
  notes: "",
  adminProvince: "",
  adminRegion: "",
  adminDistrict: "",
  adminCommune: "",
  adminFokontany: "",
  addressDetail: "",
  zoneUnits: "",
  latitude: "",
  longitude: "",
  altitude: "",
};

const inputClass = "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";
const n = (v: string): number | null => (v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

function ageOf(birthDate: string): string {
  const d = new Date(birthDate);
  if (!birthDate || Number.isNaN(d.getTime()) || d.getTime() > Date.now()) return "";
  return String(Math.max(0, Math.floor((Date.now() - d.getTime()) / 31_557_600_000)));
}

interface Result {
  code: string | null;
  agentMatricule: string | null;
  beneficiaryMatricule: string | null;
  score: number | null;
  enrolled: boolean;
  projectName: string | null;
  status: string;
  waitlistRank: number | null;
}

/**
 * Enquête d'un ménage NOUVEAU (pas encore bénéficiaire), pendant la mission, avec le MÊME formulaire que « Bénéficiaires ».
 * Le ménage reçoit un matricule d'ENQUÊTE NH-AAAA-ENQ-xxxx, rattaché au matricule de l'agent (NH-AAAA-AGT-xxxx) qui enquête.
 * Son matricule bénéficiaire NH-AAAA-BEN-xxxxxxx ne lui est attribué que s'il est sélectionné.
 * L'IA le note ; s'il remplit les critères d'un projet et que le quota le permet, il devient bénéficiaire.
 */
export default function CandidateSurveyCard({ position }: { position: MissionPosition | null }) {
  const [open, setOpen] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [form, setForm] = useState<Values>(EMPTY);
  const [projects, setProjects] = useState<ProjectQuota[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [agentMatricule, setAgentMatricule] = useState<string | null>(null);

  useEffect(() => {
    if (!open || projects.length) return;

    api
      .get("/enrollment/overview")
      .then((res) => setProjects((res.data?.data as EnrollmentOverview)?.projects ?? []))
      .catch(() => setProjects([]));
  }, [open, projects.length]);

  // Matricule de l'agent : l'enquête y est rattachée
  useEffect(() => {
    if (!open) return;

    api
      .get("/enrollment/next-code")
      .then((res) => setAgentMatricule((res.data?.data?.agentMatricule as string | null) ?? null))
      .catch(() => setAgentMatricule(null));
  }, [open]);

  // Domicile proposé = position GPS de l'agent (modifiable sur la carte)
  useEffect(() => {
    if (!open || !position) return;
    setForm((cur) => (cur.latitude !== "" ? cur : { ...cur, latitude: position.latitude.toFixed(6), longitude: position.longitude.toFixed(6), altitude: position.altitude != null ? String(Math.round(position.altitude)) : "" }));
  }, [open, position]);

  const str = (key: string) => String(form[key] ?? "");
  const set = (patch: Values) => setForm((cur) => ({ ...cur, ...patch }));

  const openForm = () => {
    setStartedAt(new Date().toISOString());
    setResult(null);
    setError("");
    setForm(EMPTY);
    setOpen(true);
  };

  const toggleDisability = (code: string) => {
    const list = str("disabilityTypes").split(",").filter(Boolean);
    set({ disabilityTypes: (list.includes(code) ? list.filter((c) => c !== code) : [...list, code]).join(",") });
  };

  const hasPoint = (str("latitude") !== "" && str("longitude") !== "") || !!position;

  const problem = (): string => {
    if (!str("lastName").trim()) return "Le nom est obligatoire.";
    if (str("phone") && str("phone").length !== 10) return "Le téléphone doit comporter 10 chiffres.";
    if (str("cinNumber") && str("cinNumber").length !== 12) return "Le numéro de CIN doit contenir exactement 12 chiffres.";
    if (form.hasDisability === true && !str("disabilityTypes")) return "Choisissez au moins un type de handicap.";

    // Mêmes contrôles que la fiche « Bénéficiaire »
    const today = new Date().toISOString().slice(0, 10);
    const birth = str("birthDate");
    const issued = str("cinIssuedAt");

    if (birth && birth > today) return "La date de naissance ne peut pas être dans le futur.";
    if (issued && issued > today) return "La date de délivrance du CIN ne peut pas être dans le futur.";
    if (birth && issued && issued <= birth) return "La date de délivrance du CIN doit être postérieure à la date de naissance.";

    const phoneIssue = str("phone") ? phoneProblem(str("phone")) : null;
    if (phoneIssue) return phoneIssue;

    const mailIssue = str("email") ? emailProblem(str("email"), PERSON_EMAIL_DOMAINS) : null;
    if (mailIssue) return mailIssue;

    const cin = str("cinNumber");
    return cinPrefixError(cin, [str("cinIssuedPlace"), str("birthPlace")]) ?? cinSexProblem(cin, str("gender")) ?? householdProblem(str("householdSize"), str("childrenUnder5")) ?? "";
  };

  const send = async (matricule: string | null) => {
    const birth = str("birthDate");
    const lat = str("latitude") !== "" ? Number(str("latitude")) : position?.latitude;
    const lng = str("longitude") !== "" ? Number(str("longitude")) : position?.longitude;
    const alt = str("altitude") !== "" ? Number(str("altitude")) : position?.altitude;

    return api.post("/enrollment/candidates", {
      matricule,
      firstName: str("firstName").trim(),
      lastName: str("lastName").trim(),
      gender: str("gender") || null,
      birthDate: birth || null,
      birthPlace: str("birthPlace").trim() || null,
      age: birth ? null : n(str("age")),
      phone: str("phone") || null,
      email: str("email").trim() || null,
      cinNumber: str("cinNumber") || null,
      cinIssuedAt: str("cinIssuedAt") || null,
      cinIssuedPlace: str("cinIssuedPlace").trim() || null,
      cinDuplicata: form.cinDuplicata === true,
      projectId: str("projectId") ? Number(str("projectId")) : null,
      householdSize: n(str("householdSize")),
      monthlyIncome: n(str("monthlyIncome")),
      childrenUnder5: n(str("childrenUnder5")),
      hasDisability: form.hasDisability === true,
      disabilityTypes: str("disabilityTypes") || null,
      outOfSchoolChildren: n(str("outOfSchoolChildren")),
      mealsPerDay: n(str("mealsPerDay")),
      housingType: str("housingType") || null,
      healthIssues: form.healthIssues === true,
      waterAccess: form.waterAccess === true,
      electricityAccess: form.electricityAccess === true,
      vulnerable: form.vulnerable === true,
      notes: str("notes").trim() || null,
      adminProvince: str("adminProvince") || null,
      adminRegion: str("adminRegion") || null,
      adminDistrict: str("adminDistrict") || null,
      adminCommune: str("adminCommune") || null,
      adminFokontany: str("adminFokontany") || null,
      addressDetail: str("addressDetail").trim() || null,
      zoneUnits: str("zoneUnits") || null,
      startedAt,
      latitude: lat,
      longitude: lng,
      altitude: alt,
    });
  };

  const submit = async () => {
    const issue = problem();
    if (issue) {
      setError(issue);
      return;
    }

    setSaving(true);
    setError("");

    try {
      let res;

      try {
        res = await send(str("matricule").trim() || null);
      } catch (err) {
        // Un autre agent a pris le numéro proposé entre-temps : on laisse le serveur donner le suivant
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 409 && /^NH-\d{4}-ENQ-\d+$/.test(str("matricule").trim())) res = await send(null);
        else throw err;
      }

      const d = res.data?.data as Result;
      setResult(d);
      setForm(EMPTY);
      setOpen(false);
      toast.success(d.enrolled ? `Ménage inscrit comme bénéficiaire (${d.projectName})` : "Enquête enregistrée");
    } catch (err) {
      setError(errorMessage(err, "Enregistrement impossible."));
    } finally {
      setSaving(false);
    }
  };

  const text = (key: string, label: string, extra: { type?: string; max?: number; digits?: number; placeholder?: string; readOnly?: boolean; value?: string } = {}) => (
    <label className="block text-sm">
      <span className="mb-1 block text-gray-600">{label}</span>
      <input
        type={extra.type ?? "text"}
        value={extra.value ?? str(key)}
        readOnly={extra.readOnly}
        maxLength={extra.digits ?? extra.max}
        inputMode={extra.digits ? "numeric" : undefined}
        placeholder={extra.placeholder}
        onChange={(e) => set({ [key]: extra.digits ? e.target.value.replace(/\D/g, "").slice(0, extra.digits) : e.target.value })}
        className={inputClass}
      />
    </label>
  );

  const num = (key: string, label: string, max = 99) => (
    <label className="block text-sm">
      <span className="mb-1 block text-gray-600">{label}</span>
      <input type="number" min={0} max={max} value={str(key)} onChange={(e) => set({ [key]: e.target.value })} className={inputClass} />
    </label>
  );

  const check = (key: string, label: string) => (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
      <input type="checkbox" checked={form[key] === true} onChange={(e) => set({ [key]: e.target.checked })} className="h-4 w-4" />
      {label}
    </label>
  );

  const title = (label: string) => <h3 className="border-b border-gray-200 pb-1 text-sm font-semibold text-gray-800">{label}</h3>;

  const message = (r: Result) => {
    if (r.enrolled) return `Retenu : le ménage est devenu bénéficiaire du projet « ${r.projectName} »${r.beneficiaryMatricule ? ` (matricule ${r.beneficiaryMatricule})` : ""}, score ${r.score ?? "—"}.`;
    if (r.status === "WAITLIST") return `Éligible, mais le quota est atteint : liste d'attente, rang ${r.waitlistRank ?? "—"} (score ${r.score ?? "—"}).`;
    if (r.status === "NOT_ELIGIBLE") return `Enregistré (score ${r.score ?? "—"}) : les critères des projets ne sont pas remplis.`;
    return `Enregistré (score ${r.score ?? "—"}) : en attente d'évaluation par les projets.`;
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-gray-900">
            <UserPlus className="h-5 w-5 text-blue-800" /> Nouveau ménage à enquêter
          </h2>
          <p className="text-xs text-gray-500">
            Même formulaire que « Bénéficiaires ». L&apos;enquête reçoit un matricule d&apos;enquête (ENQ), rattaché à votre matricule d&apos;agent : l&apos;IA la note et, si le ménage est sélectionné selon le quota du projet, il devient bénéficiaire avec un nouveau matricule (BEN).
          </p>
        </div>

        {!open && (
          <button type="button" onClick={openForm} className="rounded-xl bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900">
            Enquêter un nouveau ménage
          </button>
        )}
      </div>

      {result && !open && (
        <p className={`mt-4 rounded-xl p-3 text-sm ${result.enrolled ? "bg-green-50 text-green-800" : "bg-slate-50 text-gray-700"}`}>
          {result.code ? <b>{result.code}{result.agentMatricule ? ` (agent ${result.agentMatricule})` : ""} · </b> : null}
          {message(result)}
        </p>
      )}

      {open && (
        <div className="mt-4 space-y-5">
          <p className="rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-900">
            Enquêteur : <b className="font-mono">{agentMatricule ?? "—"}</b> — cette enquête est rattachée à votre matricule d&apos;agent et envoyée à « Enquêtes &amp; sélection » pour la sélection automatique.
          </p>
          {title("Informations personnelles")}
          <div className="grid gap-3 sm:grid-cols-2">
            <EntityMatriculeField
              endpoint="/enrollment"
              label="Matricule de l'enquête"
              placeholder="NH-2026-ENQ-0001"
              help="Proposé automatiquement ; modifiable. Le matricule bénéficiaire (BEN) n'est attribué que si le ménage est sélectionné."
              isEdit={false}
              value={str("matricule")}
              onChange={(v) => set({ matricule: v })}
            />
            {text("firstName", "Prénom (facultatif)")}
            {text("lastName", "Nom *")}
            <label className="block text-sm">
              <span className="mb-1 block text-gray-600">Genre</span>
              <select value={str("gender")} onChange={(e) => set({ gender: e.target.value })} className={inputClass}>
                <option value="">Sélectionner</option>
                <option value="FEMALE">Femme</option>
                <option value="MALE">Homme</option>
              </select>
            </label>
            {text("birthDate", "Date de naissance (certificat)", { type: "date" })}
            {str("birthDate")
              ? text("age", "Âge", { readOnly: true, value: ageOf(str("birthDate")), placeholder: "Calculé à partir de la date de naissance" })
              : num("age", "Âge (si pas de date de naissance)", 120)}
            {text("birthPlace", "Lieu de naissance (certificat)")}
            {text("phone", "Téléphone", { digits: 10, placeholder: "0340000000" })}
            {text("email", "Email", { type: "email" })}
          </div>

          {title("Carte d'identité nationale (CIN)")}
          <div className="grid gap-3 sm:grid-cols-2">
            {text("cinNumber", "N° CIN (12 chiffres)", { digits: 12 })}
            {text("cinIssuedAt", "Date de délivrance du CIN", { type: "date" })}
            {text("cinIssuedPlace", "Lieu de délivrance du CIN")}
            <div className="flex items-end pb-2">{check("cinDuplicata", "CIN délivré en duplicata")}</div>
          </div>

          {title("Projet et ménage")}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-gray-600">Projet visé (facultatif)</span>
              <select value={str("projectId")} onChange={(e) => set({ projectId: e.target.value })} className={inputClass}>
                <option value="">Tous les projets avec critères</option>
                {projects.map((p) => (
                  <option key={p.projectId} value={p.projectId}>
                    {p.name}
                    {p.remaining !== null ? ` — ${p.remaining} place(s)` : ""}
                  </option>
                ))}
              </select>
            </label>
            {num("householdSize", "Taille du ménage (personnes)", 100)}
            {num("monthlyIncome", "Revenu mensuel du ménage (Ar)", 100000000)}
            {num("childrenUnder5", "Enfants de moins de 5 ans", 50)}
            {num("outOfSchoolChildren", "Enfants non scolarisés", 50)}
            {num("mealsPerDay", "Repas par jour", 10)}
            <label className="block text-sm">
              <span className="mb-1 block text-gray-600">Type d&apos;habitat</span>
              <select value={str("housingType")} onChange={(e) => set({ housingType: e.target.value })} className={inputClass}>
                <option value="">—</option>
                <option value="Dur (briques / béton)">Dur (briques / béton)</option>
                <option value="Semi-dur">Semi-dur</option>
                <option value="Traditionnel (terre / bois)">Traditionnel (terre / bois)</option>
                <option value="Précaire">Précaire</option>
              </select>
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {check("hasDisability", "Personne en situation de handicap dans le ménage")}
            {check("healthIssues", "Problèmes de santé dans le ménage")}
            {check("waterAccess", "Accès à l'eau potable")}
            {check("electricityAccess", "Accès à l'électricité")}
            {check("vulnerable", "Ménage jugé vulnérable par l'agent")}
          </div>

          {form.hasDisability === true && (
            <div className="rounded-xl border border-gray-200 p-3">
              <p className="mb-2 text-sm text-gray-600">Type(s) de handicap (plusieurs choix possibles)</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {DISABILITY_OPTIONS.map((o) => (
                  <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={str("disabilityTypes").split(",").includes(o.value)} onChange={() => toggleDisability(o.value)} className="h-4 w-4" />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {title("Domicile du ménage")}
          <BeneficiaryLocationField label="Localisation : province, région, district, commune, fokontany" values={form} setMany={set} geo={{ lat: "latitude", lng: "longitude", alt: "altitude" }} />

          <textarea value={str("notes")} onChange={(e) => set({ notes: e.target.value })} rows={2} placeholder="Observations (facultatif)" className={inputClass} />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={saving || !hasPoint || !str("lastName").trim()} onClick={() => void submit()} className="rounded-xl bg-blue-800 px-5 py-2.5 font-semibold text-white hover:bg-blue-900 disabled:opacity-60">
              {saving ? "Enregistrement…" : hasPoint ? "Enregistrer l'enquête" : "En attente du signal GPS…"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
