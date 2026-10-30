"use client";

import { MENTIONS, MENTION_TONE, type Mention } from "@/lib/mention";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Database, Loader2, Search, ShieldAlert, X } from "lucide-react";
import api from "@/lib/axios";
import { AppLayout } from "@/components/layout";
import { errorMessage, fetchLookup, type LookupItem } from "@/lib/crud";
import { roleLabel } from "@/lib/roles";
import { PartnersField, parseIds } from "@/components/crud/PartnersField";
import { toast } from "@/lib/toast";

interface InternshipOption {
  id: number;
  projectId?: number | null;
  title: string;
  status: string;
  student?: { firstName: string; lastName: string };
}

/** Personne trouvée dans la base de données (compte utilisateur ou bénéficiaire) */
interface Candidate {
  source: "USER" | "BENEFICIARY";
  id: number;
  projectId?: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  birthDate: string | null;
  birthPlace: string | null;
  cinNumber: string | null;
  cinIssuedAt: string | null;
  cinIssuedPlace: string | null;
  cinDuplicata: boolean;
  cinDuplicataAt: string | null;
  /** Fiche du bénéficiaire (mêmes champs que « Ajouter un bénéficiaire ») */
  beneficiary?: {
    projectName: string | null;
    firstName: string | null;
    lastName: string | null;
    gender: string | null;
    age: number | null;
    vulnerable: boolean;
    locality: string | null;
    zoneName: string | null;
    householdSize: number | null;
    monthlyIncome: number | null;
    childrenUnder5: number | null;
    hasDisability: boolean;
  };
  role: string | null;
  status: string | null;
  subtitle: string | null;
  /** Lus dans la base de données */
  departmentName?: string | null;
  theme?: string | null;
}

/** Slogan + partenaires du projet (imprimés sur le certificat) */
interface ProjectBranding {
  id: number;
  name: string;
  slogan: string | null;
  partners: Array<{ id: number; name: string; slogan?: string | null; logoUrl?: string | null }>;
}

/** Lieu de stage, note finale /20 et mention proposés par le suivi & évaluation */
interface CertificateSuggestion {
  theme: string;
  departmentName: string | null;
  missionLocation: string | null;
  locationSource: "ACTIVITES" | "GPS" | "SIEGE" | null;
  finalScoreOn20: number | null;
  mention: Mention | null;
  breakdown: {
    tasks: number | null;
    reports: number | null;
    evaluations: number | null;
    presence: number | null;
    evaluationAverageOn20: number | null;
    progress: number | null;
    gpsCheckins: number;
  };
}

const LOCATION_SOURCE_LABEL: Record<string, string> = {
  ACTIVITES: "les activités du projet",
  GPS: "la position GPS du stagiaire",
  SIEGE: "la ville du siège de l'ONG",
};

/** Informations que la base de données peut fournir */
type DbField =
  | "holderName"
  | "holderEmail"
  | "holderPhone"
  | "holderBirthDate"
  | "holderBirthPlace"
  | "holderCin"
  | "holderCinIssuedAt"
  | "holderCinIssuedPlace"
  | "departmentName"
  | "theme";

type Presence = "found" | "missing" | "changed" | "manual" | null;

interface FormState {
  holderName: string;
  holderEmail: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  expiresAt: string;
  holderPhone: string;
  holderBirthDate: string;
  holderBirthPlace: string;
  holderCin: string;
  holderCinIssuedAt: string;
  holderCinIssuedPlace: string;
  holderCinDuplicata: boolean;
  holderCinDuplicataAt: string;
  missionLocation: string;
  /** Thème du stagiaire / de la mission (imprimé : « intitulé « thème » ») */
  theme: string;
  /** Département (imprimé : « dans le département : … ») */
  departmentName: string;
}

const TYPES = [
  { value: "INTERNSHIP", label: "Stage terminé (données lues dans le stage)" },
  { value: "VOLUNTEER", label: "Bénévolat" },
  { value: "STAFF", label: "Mission / emploi à l'ONG" },
  { value: "TRAINING", label: "Formation suivie" },
  { value: "BENEFICIARY", label: "Bénéficiaire d'un projet (données lues dans sa fiche)" },
];

const GENDER_LABEL: Record<string, string> = { MALE: "Homme", FEMALE: "Femme", OTHER: "Autre" };

/** Fiche du bénéficiaire lue dans la base de données (lecture seule) */
function BeneficiarySheet({ b, phone, email }: { b: NonNullable<Candidate["beneficiary"]>; phone: string | null; email: string | null }) {
  const yesNo = (v: boolean) => (v ? "Oui" : "Non");
  const rows: Array<[string, string]> = [
    ["Projet", b.projectName ?? "—"],
    ["Prénom", b.firstName ?? "—"],
    ["Nom", b.lastName ?? "—"],
    ["Genre", b.gender ? GENDER_LABEL[b.gender] ?? b.gender : "—"],
    ["Âge", b.age !== null ? `${b.age} ans` : "—"],
    ["Téléphone", phone ?? "—"],
    ["Email", email ?? "—"],
    ["Personne vulnérable", yesNo(b.vulnerable)],
    ["Localité / fokontany", b.locality ?? "—"],
    ["Zone d'intervention", b.zoneName ?? "—"],
    ["Taille du ménage", b.householdSize !== null ? `${b.householdSize} personne(s)` : "—"],
    ["Revenu mensuel du ménage", b.monthlyIncome !== null ? `${b.monthlyIncome.toLocaleString("fr-FR")} Ar` : "—"],
    ["Enfants de moins de 5 ans", b.childrenUnder5 !== null ? String(b.childrenUnder5) : "—"],
    ["Handicap dans le ménage", yesNo(b.hasDisability)],
  ];

  return (
    <div className="space-y-2 rounded-2xl border border-green-200 bg-green-50/50 p-4">
      <p className="text-sm font-semibold text-gray-800">Fiche du bénéficiaire (lue dans la base de données)</p>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-medium text-gray-500">{label}</dt>
            <dd className="font-semibold text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const DB_LABELS: Record<DbField, string> = {
  holderName: "nom",
  holderEmail: "e-mail",
  holderPhone: "téléphone",
  holderBirthDate: "date de naissance",
  holderBirthPlace: "lieu de naissance",
  holderCin: "numéro de CIN",
  holderCinIssuedAt: "date de délivrance du CIN",
  holderCinIssuedPlace: "lieu de délivrance du CIN",
  departmentName: "département",
  theme: "thème",
};

const EMPTY_FORM: FormState = {
  holderName: "",
  holderEmail: "",
  title: "",
  description: "",
  startDate: "",
  endDate: "",
  expiresAt: "",
  holderPhone: "",
  holderBirthDate: "",
  holderBirthPlace: "",
  holderCin: "",
  holderCinIssuedAt: "",
  holderCinIssuedPlace: "",
  holderCinDuplicata: false,
  holderCinDuplicataAt: "",
  missionLocation: "",
  theme: "",
  departmentName: "",
};

/** Informations personnelles remplies depuis la base de données */
const PERSON_RESET = {
  holderEmail: "",
  holderPhone: "",
  holderBirthDate: "",
  holderBirthPlace: "",
  holderCin: "",
  holderCinIssuedAt: "",
  holderCinIssuedPlace: "",
  holderCinDuplicata: false,
  holderCinDuplicataAt: "",
};

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

/** ISO -> valeur d'un <input type="date"> */
const toDateInput = (value: string | null | undefined): string => (value ? String(value).slice(0, 10) : "");

/** Valeurs réellement présentes dans la base de données pour cette personne */
function valuesOf(c: Candidate): Partial<Record<DbField, string>> {
  return {
    holderName: c.name ?? "",
    holderEmail: c.email ?? "",
    holderPhone: c.phone ?? "",
    holderBirthDate: toDateInput(c.birthDate),
    holderBirthPlace: c.birthPlace ?? "",
    holderCin: c.cinNumber ?? "",
    holderCinIssuedAt: toDateInput(c.cinIssuedAt),
    holderCinIssuedPlace: c.cinIssuedPlace ?? "",
    departmentName: c.departmentName ?? "",
    theme: c.theme ?? "",
  };
}

const clean = (value: string): string | undefined => (value.trim() ? value.trim() : undefined);

function Tag({ state }: { state: Presence }) {
  if (!state) return null;

  const styles: Record<Exclude<Presence, null>, { label: string; className: string }> = {
    found: { label: "✓ Dans la base de données", className: "bg-green-100 text-green-700" },
    missing: { label: "Absent de la base — à compléter", className: "bg-amber-100 text-amber-800" },
    changed: { label: "Modifié (différent de la base)", className: "bg-blue-100 text-blue-700" },
    manual: { label: "Saisie manuelle", className: "bg-gray-100 text-gray-600" },
  };

  const { label, className } = styles[state];

  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${className}`}>{label}</span>;
}

export default function CreateCertificatePage() {
  const router = useRouter();
  const [type, setType] = useState("INTERNSHIP");
  const [internships, setInternships] = useState<InternshipOption[]>([]);
  const [internshipId, setInternshipId] = useState("");
  const [suggestion, setSuggestion] = useState<CertificateSuggestion | null>(null);
  const [mention, setMention] = useState(""); // vide = automatique
  const [projects, setProjects] = useState<LookupItem[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]); // vide = « Aucun projet »
  const [brandings, setBrandings] = useState<ProjectBranding[]>([]);
  const [partnerIds, setPartnerIds] = useState(""); // partenaires imprimés (modifiables)
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Recherche dans la base de données
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [dbValues, setDbValues] = useState<Partial<Record<DbField, string>>>({});
  const [saveToProfile, setSaveToProfile] = useState(true);

  // Cas particulier
  const [specialCase, setSpecialCase] = useState(false);
  const [specialCaseNote, setSpecialCaseNote] = useState("");

  const isInternship = type === "INTERNSHIP";
  const isBeneficiary = type === "BENEFICIARY";

  useEffect(() => {
    api
      .get("/internships")
      .then((res) =>
        setInternships((res.data?.data ?? []).filter((i: InternshipOption) => i.status === "COMPLETED"))
      )
      .catch(() => setInternships([]));

    fetchLookup("projects").then(setProjects).catch(() => setProjects([]));

    const preset = new URLSearchParams(window.location.search).get("internshipId");
    if (preset) setInternshipId(preset);
  }, []);

  // Projets choisis : on lit leurs slogans et leurs partenaires pour l'aperçu
  const projectKey = projectIds.join(",");

  useEffect(() => {
    if (projectIds.length === 0) {
      setBrandings([]);
      setPartnerIds("");
      return;
    }

    let cancelled = false;

    Promise.all(
      projectIds.map((id) =>
        api
          .get(`/certificates/project-branding/${id}`)
          .then((res) => (res.data?.data ?? null) as ProjectBranding | null)
          .catch(() => null),
      ),
    ).then((list) => {
      if (cancelled) return;
      const found = list.filter((b): b is ProjectBranding => b !== null);
      setBrandings(found);

      // Par défaut : tous les partenaires des projets choisis, sans doublon (on peut ensuite en retirer)
      const ids = new Set<number>();
      found.forEach((b) => b.partners.forEach((p) => ids.add(p.id)));
      setPartnerIds(Array.from(ids).join(","));
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectKey]);

  /** Partenaires de tous les projets choisis (sans doublon) */
  const partnerOptions = useMemo(() => {
    const seen = new Set<number>();
    const list: ProjectBranding["partners"] = [];

    brandings.forEach((b) =>
      b.partners.forEach((p) => {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          list.push(p);
        }
      }),
    );

    return list;
  }, [brandings]);

  const toggleProject = (id: string) =>
    setProjectIds((cur) => (cur.includes(id) ? cur.filter((v) => v !== id) : [...cur, id]));

  // Stage choisi : le projet du stage est sélectionné automatiquement
  useEffect(() => {
    if (!isInternship || !internshipId) return;
    const linked = internships.find((i) => String(i.id) === internshipId)?.projectId;
    if (linked) setProjectIds([String(linked)]);
  }, [isInternship, internshipId, internships]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((cur) => ({ ...cur, [key]: value }));

  /* ------------------------------ base de données ------------------------------ */

  /** Remplit le formulaire avec tout ce que la base connaît ; ce qui manque reste à saisir. */
  const applyCandidate = (candidate: Candidate, fromInternship = false) => {
    const values = valuesOf(candidate);

    setSelected(candidate);
    setDbValues(values);
    setSaveToProfile(true);

    // Bénéficiaire : son projet (donc le slogan et les partenaires) est choisi automatiquement
    if (candidate.source === "BENEFICIARY" && candidate.projectId) setProjectIds([String(candidate.projectId)]);

    // Stage : tout vient de la base de données (aucune valeur d'un stagiaire précédent ne reste)
    setForm((cur) => {
      const keep = (fromDb: string, current: string) => (fromInternship ? fromDb : fromDb || current);

      return {
        ...cur,
        holderName: fromInternship ? cur.holderName : values.holderName || cur.holderName,
        holderEmail: keep(values.holderEmail ?? "", cur.holderEmail),
        holderPhone: keep(values.holderPhone ?? "", cur.holderPhone),
        holderBirthDate: keep(values.holderBirthDate ?? "", cur.holderBirthDate),
        holderBirthPlace: keep(values.holderBirthPlace ?? "", cur.holderBirthPlace),
        holderCin: keep(values.holderCin ?? "", cur.holderCin),
        holderCinIssuedAt: keep(values.holderCinIssuedAt ?? "", cur.holderCinIssuedAt),
        holderCinIssuedPlace: keep(values.holderCinIssuedPlace ?? "", cur.holderCinIssuedPlace),
        holderCinDuplicata: fromInternship ? candidate.cinDuplicata : candidate.cinDuplicata || cur.holderCinDuplicata,
        holderCinDuplicataAt: keep(toDateInput(candidate.cinDuplicataAt), cur.holderCinDuplicataAt),
        // Département + thème : lus dans la base de données (compte, dernier stage ou projet)
        departmentName: keep(values.departmentName ?? "", cur.departmentName),
        theme: keep(values.theme ?? "", cur.theme),
        // Bénéficiaire : lieu de mission = localité + zone d'intervention de sa fiche
        missionLocation:
          candidate.source === "BENEFICIARY"
            ? [candidate.beneficiary?.locality, candidate.beneficiary?.zoneName].filter(Boolean).join(" / ") || cur.missionLocation
            : cur.missionLocation,
      };
    });
  };

  /** Oublie la personne choisie et vide ses informations personnelles. */
  const resetPerson = () => {
    setSelected(null);
    setDbValues({});
    setQuery("");
    setResults([]);
    setSearched(false);

    setForm((cur) => ({
      ...cur,
      holderName: "",
      holderEmail: "",
      holderPhone: "",
      holderBirthDate: "",
      holderBirthPlace: "",
      holderCin: "",
      holderCinIssuedAt: "",
      holderCinIssuedPlace: "",
      holderCinDuplicata: false,
      holderCinDuplicataAt: "",
    }));
  };

  const changeType = (value: string) => {
    setType(value);
    setSelected(null);
    setDbValues({});
    setQuery("");
    setResults([]);
    setSearched(false);
  };

  // Recherche par nom, téléphone ou e-mail (légèrement différée pendant la frappe)
  useEffect(() => {
    if (isInternship || specialCase || selected) return;

    const term = query.trim();

    if (term.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    let cancelled = false;
    setSearching(true);

    const timer = window.setTimeout(() => {
      api
        .get("/certificates/lookup", { params: { q: term, only: isBeneficiary ? "BENEFICIARY" : undefined } })
        .then((res) => {
          if (!cancelled) setResults(res.data?.data ?? []);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) {
            setSearching(false);
            setSearched(true);
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, isInternship, isBeneficiary, specialCase, selected]);

  // Stage choisi : on lit la fiche du stagiaire dans la base de données
  useEffect(() => {
    if (!isInternship) return;

    if (!internshipId) {
      setSelected(null);
      setDbValues({});
      setSuggestion(null);
      setMention("");
      setForm((cur) => ({ ...cur, ...PERSON_RESET, missionLocation: "", theme: "", departmentName: "" }));
      return;
    }

    let cancelled = false;

    api
      .get(`/certificates/lookup/internship/${internshipId}`)
      .then((res) => {
        if (cancelled) return;
        if (res.data?.data) applyCandidate(res.data.data as Candidate, true);

        // Lieu de stage et mention : remplis automatiquement depuis le suivi & évaluation
        const auto = (res.data?.suggestion ?? null) as CertificateSuggestion | null;
        setSuggestion(auto);
        setDbValues((cur) => ({ ...cur, departmentName: auto?.departmentName ?? "", theme: auto?.theme ?? "" }));
        setMention("");
        // Lieu de stage : toujours celui du stage choisi (jamais celui d'un stage précédent)
        // Thème et département : ceux du stage choisi (modifiables avant la délivrance)
        setForm((cur) => ({
          ...cur,
          missionLocation: auto?.missionLocation ?? "",
          theme: auto?.theme ?? "",
          departmentName: auto?.departmentName ?? "",
        }));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInternship, internshipId]);

  const toggleSpecialCase = (on: boolean) => {
    setSpecialCase(on);

    if (on) {
      // Saisie libre : aucune fiche n'est liée ni modifiée dans la base de données
      setSelected(null);
      setDbValues({});
      setQuery("");
      setResults([]);
      setSearched(false);
    }
  };

  /** Cette information existe-t-elle dans la base de données ? */
  const presence = (field: DbField): Presence => {
    if (specialCase) return "manual";
    if (!selected) return null;

    const inDatabase = dbValues[field];
    if (!inDatabase) return "missing";

    return String(form[field] ?? "").trim() === inDatabase ? "found" : "changed";
  };

  const tracked: DbField[] = isInternship
    ? ["departmentName", "theme", "holderPhone", "holderBirthDate", "holderBirthPlace", "holderCin", "holderCinIssuedAt", "holderCinIssuedPlace"]
    : ["holderName", "holderEmail", "departmentName", "theme", "holderPhone", "holderBirthDate", "holderBirthPlace", "holderCin", "holderCinIssuedAt", "holderCinIssuedPlace"];

  const missingInDb = selected ? tracked.filter((field) => !dbValues[field]) : [];

  /** Champ avec son étiquette « dans la base / absent de la base » */
  const field = (key: DbField, label: string, input: ReactNode, className = "") => (
    <label key={key} className={`space-y-1 text-sm font-medium text-gray-700 ${className}`}>
      <span className="flex flex-wrap items-center gap-2">
        {label}
        <Tag state={presence(key)} />
      </span>
      {input}
    </label>
  );

  /* ------------------------------ envoi ------------------------------ */

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (specialCase && specialCaseNote.trim().length < 5) {
      setError("Précisez le motif du cas particulier.");
      return;
    }

    setBusy(true);

    try {
      const personal = {
        holderPhone: clean(form.holderPhone),
        holderBirthDate: clean(form.holderBirthDate),
        holderBirthPlace: clean(form.holderBirthPlace),
        holderCin: clean(form.holderCin),
        holderCinIssuedAt: clean(form.holderCinIssuedAt),
        holderCinIssuedPlace: clean(form.holderCinIssuedPlace),
        holderCinDuplicata: form.holderCinDuplicata,
        holderCinDuplicataAt: form.holderCinDuplicata ? clean(form.holderCinDuplicataAt) : undefined,
        missionLocation: clean(form.missionLocation),
        theme: clean(form.theme),
        departmentName: clean(form.departmentName),
        projectIds: projectIds.map(Number),
        partnerIds: parseIds(partnerIds),
        beneficiaryId: !specialCase && selected?.source === "BENEFICIARY" ? selected.id : undefined,
        specialCase,
        specialCaseNote: specialCase ? specialCaseNote.trim() : undefined,
        // La base de données se complète toute seule (champs vides uniquement) pour un compte utilisateur
        saveToProfile: !specialCase && selected?.source === "USER" && saveToProfile,
      };

      const payload = isInternship
        ? {
            type,
            internshipId: Number(internshipId),
            title: form.title || undefined,
            description: form.description || undefined,
            mention: mention || suggestion?.mention || undefined,
            ...personal,
          }
        : {
            type,
            holderName: form.holderName,
            holderEmail: form.holderEmail,
            title: form.title,
            description: form.description,
            startDate: clean(form.startDate),
            endDate: clean(form.endDate),
            expiresAt: clean(form.expiresAt),
            userId: !specialCase && selected?.source === "USER" ? selected.id : undefined,
            ...personal,
          };

      const res = await api.post("/certificates", payload);

      toast.success("Certificat délivré. Le titulaire a été prévenu.");

      const updated: string[] = res.data?.profileUpdated ?? [];
      if (updated.length > 0) toast.info(`Base de données complétée : ${updated.join(", ")}.`);

      router.push(`/certificates/${res.data.data.id}`);
    } catch (err) {
      setError(errorMessage(err, "Délivrance impossible."));
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------ affichage ------------------------------ */

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Délivrer un certificat</h1>

        <form onSubmit={submit} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <label className="block space-y-1 text-sm font-medium text-gray-700">
            Type de certificat
            <select className={inputClass} value={type} onChange={(e) => changeType(e.target.value)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>

          {/* ---------- Cas particulier ---------- */}
          <div className={`rounded-2xl border p-4 ${specialCase ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-gray-50/60"}`}>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={specialCase}
                onChange={(e) => toggleSpecialCase(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="flex items-center gap-2 font-semibold">
                  <ShieldAlert className="h-4 w-4 text-amber-600" /> Cas particulier
                </span>
                <span className="block text-xs text-gray-500">
                  Personne absente de la base de données ou situation spéciale (perte du CIN, changement de nom, régularisation…).
                  La saisie est libre, aucune fiche existante n&apos;est modifiée et le motif est conservé avec le certificat.
                </span>
              </span>
            </label>

            {specialCase && (
              <label className="mt-3 block space-y-1 text-sm font-medium text-gray-700">
                Motif du cas particulier *
                <textarea
                  rows={2}
                  className={inputClass}
                  value={specialCaseNote}
                  onChange={(e) => setSpecialCaseNote(e.target.value)}
                  placeholder="Ex. Ancien bénévole non enregistré dans la plateforme"
                  required
                />
              </label>
            )}
          </div>

          {/* ---------- Recherche dans la base de données ---------- */}
          {!isInternship && !specialCase && (
            <div className="space-y-2 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Database className="h-4 w-4 text-blue-700" /> Rechercher dans la base de données
              </p>

              {selected ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>
                      <b>{selected.name}</b>
                      <span className="text-xs text-green-700">
                        {" "}· {selected.source === "USER" ? "Compte utilisateur" : "Bénéficiaire"}
                        {selected.role ? ` · ${roleLabel(selected.role)}` : ""}
                        {selected.subtitle ? ` · ${selected.subtitle}` : ""}
                      </span>
                    </span>
                  </span>

                  <button type="button" onClick={resetPerson} className="inline-flex items-center gap-1 text-xs font-semibold underline hover:text-green-950">
                    <X className="h-3.5 w-3.5" /> Changer de personne
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      className={`${inputClass} pl-10`}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Nom, téléphone (034 00 000 00) ou e-mail…"
                      autoComplete="off"
                    />
                    {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />}
                  </div>

                  {results.length > 0 && (
                    <ul className="max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-200 bg-white">
                      {results.map((candidate) => (
                        <li key={`${candidate.source}-${candidate.id}`}>
                          <button
                            type="button"
                            onClick={() => {
                              applyCandidate(candidate);
                              setQuery("");
                              setResults([]);
                            }}
                            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                              {candidate.name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-gray-900">{candidate.name}</span>
                              <span className="block truncate text-xs text-gray-500">
                                {candidate.phone ?? "Téléphone non renseigné"}
                                {candidate.email ? ` · ${candidate.email}` : ""}
                              </span>
                            </span>
                            <span className="shrink-0 text-right text-[10px] text-gray-500">
                              <span className="block font-semibold">{candidate.source === "USER" ? "Compte" : "Bénéficiaire"}</span>
                              {candidate.role ? roleLabel(candidate.role) : candidate.subtitle ?? ""}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {searched && !searching && results.length === 0 && (
                    <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Aucune fiche trouvée dans la base de données. Vous pouvez saisir les informations à la main, ou cocher « Cas particulier ».
                    </p>
                  )}

                  {!searched && <p className="text-xs text-gray-500">Choisissez une personne : tout ce que la base connaît remplit le formulaire automatiquement.</p>}
                </>
              )}
            </div>
          )}

          {/* ---------- Bilan : ce que la base contient ---------- */}
          {selected && !specialCase && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                missingInDb.length === 0 ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-900"
              }`}
            >
              <p className="font-semibold">
                Fiche trouvée dans la base de données — {tracked.length - missingInDb.length}/{tracked.length} informations disponibles.
              </p>

              {missingInDb.length > 0 ? (
                <p className="mt-1 text-xs">
                  Absentes de la base : {missingInDb.map((f) => DB_LABELS[f]).join(", ")}.
                  {selected.source === "USER"
                    ? " Saisissez-les ci-dessous : elles seront enregistrées dans la fiche à la délivrance."
                    : " Complétez-les dans la fiche du bénéficiaire (Bénéficiaires › Modifier) pour qu'elles se remplissent toutes seules."}
                </p>
              ) : (
                <p className="mt-1 text-xs">Toutes les informations nécessaires existent déjà dans la base de données.</p>
              )}
            </div>
          )}

          {isBeneficiary && selected?.source === "BENEFICIARY" && selected.beneficiary && !specialCase && (
            <BeneficiarySheet b={selected.beneficiary} phone={selected.phone} email={selected.email} />
          )}

          {/* ---------- Stage ou titulaire ---------- */}
          {isInternship ? (
            <label className="block space-y-1 text-sm font-medium text-gray-700">
              Stage terminé
              <select className={inputClass} value={internshipId} onChange={(e) => setInternshipId(e.target.value)} required>
                <option value="">Sélectionner un stage</option>
                {internships.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.student ? `${i.student.firstName} ${i.student.lastName} — ` : ""}{i.title}
                  </option>
                ))}
              </select>
              {internships.length === 0 && <span className="text-xs text-amber-700">Aucun stage « Terminé » disponible.</span>}
            </label>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {field(
                "holderName",
                "Nom complet du titulaire *",
                <input className={inputClass} value={form.holderName} onChange={(e) => set("holderName", e.target.value)} required />,
              )}
              {field(
                "holderEmail",
                "Email du titulaire (pour l'envoi)",
                <input type="email" className={inputClass} value={form.holderEmail} onChange={(e) => set("holderEmail", e.target.value)} />,
              )}

              {isBeneficiary && !specialCase ? (
                <p className="rounded-xl bg-green-50 px-3 py-2 text-xs text-green-800 md:col-span-2">
                  Le certificat indiquera : « a accompli avec sérieux la mission du projet « nom du projet : slogan » ».
                </p>
              ) : (
                <label className="space-y-1 text-sm font-medium text-gray-700 md:col-span-2">
                  Intitulé *
                  <input className={inputClass} placeholder="Ex. Bénévole animateur — Maison Digitale" value={form.title} onChange={(e) => set("title", e.target.value)} required />
                </label>
              )}
              <label className="space-y-1 text-sm font-medium text-gray-700">
                Début
                <input type="date" className={inputClass} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
              </label>
              <label className="space-y-1 text-sm font-medium text-gray-700">
                Fin
                <input type="date" className={inputClass} value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
              </label>
            </div>
          )}

          {/* ---------- Projets : slogans et partenaires imprimés sur le certificat ---------- */}
          <div className="space-y-3 rounded-2xl border border-pink-200 bg-pink-50/40 p-4">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-gray-700">
                Projets (slogans et partenaires imprimés sur le certificat — sélection multiple)
              </legend>

              <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2">
                {/* Par défaut : Aucun projet */}
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 px-3 py-2 text-sm transition ${
                    projectIds.length === 0 ? "border-blue-600 bg-blue-50" : "border-transparent hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="certificate-projects"
                    checked={projectIds.length === 0}
                    onChange={() => setProjectIds([])}
                    className="h-4 w-4 accent-blue-700"
                  />
                  <span className="font-semibold text-gray-900">Aucun projet</span>
                </label>

                {projects.map((p) => {
                  const id = String(p.id);
                  const on = projectIds.includes(id);

                  return (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 px-3 py-2 text-sm transition ${
                        on ? "border-blue-600 bg-blue-50" : "border-transparent hover:bg-gray-50"
                      }`}
                    >
                      <input type="checkbox" checked={on} onChange={() => toggleProject(id)} className="h-4 w-4 accent-blue-700" />
                      <span className="text-gray-900">{p.label}</span>
                    </label>
                  );
                })}

                {projects.length === 0 && <p className="px-3 py-2 text-xs text-gray-500">Aucun projet disponible.</p>}
              </div>

              <p className="text-xs text-gray-500">
                {projectIds.length === 0 ? "Aucun projet sélectionné." : `${projectIds.length} projet${projectIds.length > 1 ? "s" : ""} sélectionné${projectIds.length > 1 ? "s" : ""}.`}
              </p>
            </fieldset>

            {brandings.length > 0 && (
              <div className="space-y-2 rounded-xl border border-gray-200 bg-white p-3 text-center">
                {brandings.map((b) =>
                  b.slogan ? (
                    <p key={b.id} className="font-serif text-base font-medium italic text-teal-700">« {b.slogan} »</p>
                  ) : (
                    <p key={b.id} className="text-xs text-amber-700">
                      {b.name} n&apos;a pas de slogan : ajoutez-le dans « Modifier le projet ».
                    </p>
                  ),
                )}
              </div>
            )}

            {projectIds.length > 0 ? (
              <PartnersField
                label="Partenaires des projets imprimés sur ce certificat (sélection multiple)"
                value={partnerIds}
                onChange={setPartnerIds}
                options={partnerOptions}
                allowCreate={false}
                emptyHint="Aucun partenaire lié à ces projets : ajoutez-les dans « Modifier le projet »."
              />
            ) : (
              <p className="text-xs text-gray-500">Choisissez un ou plusieurs projets : leurs partenaires (logo, nom, slogan) s&apos;afficheront ici.</p>
            )}
          </div>

          {/* ---------- Identité du titulaire + lieu de mission ---------- */}
          <div className="grid gap-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4 md:grid-cols-3">
            {field(
              "holderPhone",
              "Téléphone",
              <input type="tel" className={inputClass} placeholder="Ex. 034 00 000 00" value={form.holderPhone} onChange={(e) => set("holderPhone", e.target.value)} />,
            )}
            {field(
              "holderBirthDate",
              "Date de naissance",
              <input type="date" className={inputClass} value={form.holderBirthDate} onChange={(e) => set("holderBirthDate", e.target.value)} />,
            )}
            {field(
              "holderBirthPlace",
              "Lieu de naissance",
              <input className={inputClass} placeholder="Ex. Fianarantsoa" value={form.holderBirthPlace} onChange={(e) => set("holderBirthPlace", e.target.value)} />,
            )}

            {field(
              "holderCin",
              "N° CIN",
              <input
                className={inputClass}
                inputMode="numeric"
                placeholder="12 chiffres"
                value={form.holderCin}
                onChange={(e) => set("holderCin", e.target.value)}
              />,
            )}
            {field(
              "holderCinIssuedAt",
              "Date de délivrance du CIN",
              <input type="date" className={inputClass} value={form.holderCinIssuedAt} onChange={(e) => set("holderCinIssuedAt", e.target.value)} />,
            )}
            {field(
              "holderCinIssuedPlace",
              "Lieu de délivrance du CIN",
              <input className={inputClass} placeholder="Ex. Antananarivo" value={form.holderCinIssuedPlace} onChange={(e) => set("holderCinIssuedPlace", e.target.value)} />,
            )}

            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 md:col-span-2">
              <input
                type="checkbox"
                checked={form.holderCinDuplicata}
                onChange={(e) => set("holderCinDuplicata", e.target.checked)}
                className="h-4 w-4"
              />
              Le CIN est un duplicata
              {isInternship && selected && form.holderCinDuplicata && selected.cinDuplicata && (
                <span className="text-xs font-normal text-emerald-700">✓ lu dans la base de données</span>
              )}
            </label>

            {form.holderCinDuplicata ? (
              <label className="space-y-1 text-sm font-medium text-gray-700">
                Date du duplicata
                <input type="date" className={inputClass} value={form.holderCinDuplicataAt} onChange={(e) => set("holderCinDuplicataAt", e.target.value)} />
              </label>
            ) : (
              <span className="hidden md:block" />
            )}

            {field(
              "departmentName",
              "Département",
              <input
                className={inputClass}
                placeholder="Ex. Suivi et Évaluation"
                value={form.departmentName}
                onChange={(e) => set("departmentName", e.target.value)}
              />,
            )}

            {field(
              "theme",
              isInternship ? "Thème du stagiaire" : "Thème / sujet de la mission",
              <input
                className={inputClass}
                placeholder="Ex. Suivi des indicateurs du projet"
                value={form.theme}
                onChange={(e) => set("theme", e.target.value)}
              />,
              "md:col-span-2",
            )}

            <label className="space-y-1 text-sm font-medium text-gray-700 md:col-span-3">
              {isInternship ? "Lieu de stage" : "Lieu de mission"}
              <input className={inputClass} placeholder="Ex. Fianarantsoa (un lieu, pas un département)" value={form.missionLocation} onChange={(e) => set("missionLocation", e.target.value)} />
              {isInternship && suggestion?.missionLocation && form.missionLocation === suggestion.missionLocation && (
                <span className="block text-xs font-normal text-emerald-700">
                  ✓ Rempli automatiquement d&apos;après {LOCATION_SOURCE_LABEL[suggestion.locationSource ?? ""] ?? "le suivi & évaluation"}.
                </span>
              )}
            </label>

            <p className="text-xs text-gray-500 md:col-span-3">
              {isInternship
                ? "Pour un stage, ces informations sont lues dans le profil du stagiaire. Les champs ci-dessus ne servent que si son profil n'est pas encore renseigné."
                : "La date et le lieu de naissance, le CIN et le lieu de mission apparaissent sur le certificat."}
            </p>
          </div>

          {selected?.source === "USER" && !specialCase && (
            <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={saveToProfile} onChange={(e) => setSaveToProfile(e.target.checked)} className="mt-0.5 h-4 w-4" />
              <span>
                Compléter la fiche de <b>{selected.name}</b> dans la base de données avec les informations saisies
                <span className="block text-xs text-gray-500">Seuls les champs encore vides sont remplis : rien d&apos;existant n&apos;est écrasé.</span>
              </span>
            </label>
          )}

          {isInternship ? (
            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <label className="block space-y-1 text-sm font-medium text-gray-700">
                Mention
                <select className={inputClass} value={mention} onChange={(e) => setMention(e.target.value)} disabled={!internshipId}>
                  <option value="">
                    {suggestion?.mention
                      ? `Automatique — ${suggestion.mention} (${suggestion.finalScoreOn20?.toFixed(1)}/20)`
                      : "Automatique — note indisponible (aucune donnée de suivi)"}
                  </option>
                  {MENTIONS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>

              {suggestion && (
                <div className="space-y-2 text-xs text-gray-600">
                  <p className="flex flex-wrap items-center gap-2">
                    Note finale du suivi &amp; évaluation :
                    <b className="text-sm text-gray-900">
                      {suggestion.finalScoreOn20 === null ? "Note indisponible" : `${suggestion.finalScoreOn20.toFixed(1).replace(".", ",")}/20`}
                    </b>
                    {(mention || suggestion.mention) && (
                      <span className={`rounded-full px-2.5 py-0.5 font-semibold ${MENTION_TONE[(mention || suggestion.mention) as Mention]}`}>
                        {mention || suggestion.mention}
                      </span>
                    )}
                    {mention && <span className="text-amber-700">(choisie manuellement)</span>}
                  </p>
                  <p>
                    Tâches {suggestion.breakdown.tasks === null ? "—" : `${Math.round(suggestion.breakdown.tasks)} %`} · Rapports{" "}
                    {suggestion.breakdown.reports === null ? "—" : `${Math.round(suggestion.breakdown.reports)} %`} · Évaluations du tuteur{" "}
                    {suggestion.breakdown.evaluationAverageOn20 === null ? "—" : `${suggestion.breakdown.evaluationAverageOn20.toFixed(1)}/20`} · Présence{" "}
                    {suggestion.breakdown.presence === null ? "—" : `${Math.round(suggestion.breakdown.presence)} %`} ({suggestion.breakdown.gpsCheckins} check-in GPS)
                  </p>
                </div>
              )}

              {internshipId && !suggestion?.mention && (
                <p className="text-xs text-amber-700">Aucune donnée de suivi pour ce stage : choisissez la mention manuellement.</p>
              )}
            </div>
          ) : (
            <label className="block space-y-1 text-sm font-medium text-gray-700">
              Mention complémentaire (optionnel)
              <textarea rows={3} className={inputClass} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </label>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={busy} className="rounded-xl bg-blue-800 px-6 py-3 font-medium text-white hover:bg-blue-900 disabled:opacity-60">
              {busy ? "Délivrance..." : "Délivrer le certificat"}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
