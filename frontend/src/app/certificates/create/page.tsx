"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Database, Loader2, Search, ShieldAlert, X } from "lucide-react";
import api from "@/lib/axios";
import { AppLayout } from "@/components/layout";
import { errorMessage } from "@/lib/crud";
import { roleLabel } from "@/lib/roles";
import { toast } from "@/lib/toast";

interface InternshipOption {
  id: number;
  title: string;
  status: string;
  student?: { firstName: string; lastName: string };
}

/** Personne trouvée dans la base de données (compte utilisateur ou bénéficiaire) */
interface Candidate {
  source: "USER" | "BENEFICIARY";
  id: number;
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
  role: string | null;
  status: string | null;
  subtitle: string | null;
}

/** Informations que la base de données peut fournir */
type DbField =
  | "holderName"
  | "holderEmail"
  | "holderPhone"
  | "holderBirthDate"
  | "holderBirthPlace"
  | "holderCin"
  | "holderCinIssuedAt"
  | "holderCinIssuedPlace";

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
}

const TYPES = [
  { value: "INTERNSHIP", label: "Stage terminé (données lues dans le stage)" },
  { value: "VOLUNTEER", label: "Bénévolat" },
  { value: "STAFF", label: "Mission / emploi à l'ONG" },
  { value: "TRAINING", label: "Formation suivie" },
];

const DB_LABELS: Record<DbField, string> = {
  holderName: "nom",
  holderEmail: "e-mail",
  holderPhone: "téléphone",
  holderBirthDate: "date de naissance",
  holderBirthPlace: "lieu de naissance",
  holderCin: "numéro de CIN",
  holderCinIssuedAt: "date de délivrance du CIN",
  holderCinIssuedPlace: "lieu de délivrance du CIN",
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

  useEffect(() => {
    api
      .get("/internships")
      .then((res) =>
        setInternships((res.data?.data ?? []).filter((i: InternshipOption) => i.status === "COMPLETED"))
      )
      .catch(() => setInternships([]));

    const preset = new URLSearchParams(window.location.search).get("internshipId");
    if (preset) setInternshipId(preset);
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((cur) => ({ ...cur, [key]: value }));

  /* ------------------------------ base de données ------------------------------ */

  /** Remplit le formulaire avec tout ce que la base connaît ; ce qui manque reste à saisir. */
  const applyCandidate = (candidate: Candidate, fromInternship = false) => {
    const values = valuesOf(candidate);

    setSelected(candidate);
    setDbValues(values);
    setSaveToProfile(true);

    setForm((cur) => ({
      ...cur,
      holderName: fromInternship ? cur.holderName : values.holderName || cur.holderName,
      holderEmail: values.holderEmail || cur.holderEmail,
      holderPhone: values.holderPhone || cur.holderPhone,
      holderBirthDate: values.holderBirthDate || cur.holderBirthDate,
      holderBirthPlace: values.holderBirthPlace || cur.holderBirthPlace,
      holderCin: values.holderCin || cur.holderCin,
      holderCinIssuedAt: values.holderCinIssuedAt || cur.holderCinIssuedAt,
      holderCinIssuedPlace: values.holderCinIssuedPlace || cur.holderCinIssuedPlace,
      holderCinDuplicata: candidate.cinDuplicata || cur.holderCinDuplicata,
      holderCinDuplicataAt: toDateInput(candidate.cinDuplicataAt) || cur.holderCinDuplicataAt,
    }));
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
        .get("/certificates/lookup", { params: { q: term } })
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
  }, [query, isInternship, specialCase, selected]);

  // Stage choisi : on lit la fiche du stagiaire dans la base de données
  useEffect(() => {
    if (!isInternship) return;

    if (!internshipId) {
      setSelected(null);
      setDbValues({});
      return;
    }

    let cancelled = false;

    api
      .get(`/certificates/lookup/internship/${internshipId}`)
      .then((res) => {
        if (!cancelled && res.data?.data) applyCandidate(res.data.data as Candidate, true);
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
    ? ["holderPhone", "holderBirthDate", "holderBirthPlace", "holderCin", "holderCinIssuedAt", "holderCinIssuedPlace"]
    : ["holderName", "holderEmail", "holderPhone", "holderBirthDate", "holderBirthPlace", "holderCin", "holderCinIssuedAt", "holderCinIssuedPlace"];

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
        specialCase,
        specialCaseNote: specialCase ? specialCaseNote.trim() : undefined,
        // La base de données se complète toute seule (champs vides uniquement) pour un compte utilisateur
        saveToProfile: !specialCase && !!selected && saveToProfile,
      };

      const payload = isInternship
        ? {
            type,
            internshipId: Number(internshipId),
            title: form.title || undefined,
            description: form.description || undefined,
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
            beneficiaryId: !specialCase && selected?.source === "BENEFICIARY" ? selected.id : undefined,
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
                  {" Saisissez-les ci-dessous : elles seront enregistrées dans la fiche à la délivrance."}
                </p>
              ) : (
                <p className="mt-1 text-xs">Toutes les informations nécessaires existent déjà dans la base de données.</p>
              )}
            </div>
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

              <label className="space-y-1 text-sm font-medium text-gray-700 md:col-span-2">
                Intitulé *
                <input className={inputClass} placeholder="Ex. Bénévole animateur — Maison Digitale" value={form.title} onChange={(e) => set("title", e.target.value)} required />
              </label>
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
                maxLength={12}
                onChange={(e) => set("holderCin", e.target.value.replace(/\D/g, "").slice(0, 12))}
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
            </label>

            {form.holderCinDuplicata ? (
              <label className="space-y-1 text-sm font-medium text-gray-700">
                Date du duplicata
                <input type="date" className={inputClass} value={form.holderCinDuplicataAt} onChange={(e) => set("holderCinDuplicataAt", e.target.value)} />
              </label>
            ) : (
              <span className="hidden md:block" />
            )}

            <label className="space-y-1 text-sm font-medium text-gray-700 md:col-span-3">
              Lieu de mission
              <input className={inputClass} placeholder="Ex. Siège — Fianarantsoa" value={form.missionLocation} onChange={(e) => set("missionLocation", e.target.value)} />
            </label>

            <p className="text-xs text-gray-500 md:col-span-3">
              {isInternship
                ? "Pour un stage, ces informations sont lues dans le profil du stagiaire. Les champs ci-dessus ne servent que si son profil n'est pas encore renseigné."
                : "La date et le lieu de naissance, le CIN et le lieu de mission apparaissent sur le certificat."}
            </p>
          </div>

          {selected && !specialCase && (
            <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={saveToProfile} onChange={(e) => setSaveToProfile(e.target.checked)} className="mt-0.5 h-4 w-4" />
              <span>
                Compléter la fiche de <b>{selected.name}</b> dans la base de données avec les informations saisies
                <span className="block text-xs text-gray-500">Seuls les champs encore vides sont remplis : rien d&apos;existant n&apos;est écrasé.</span>
              </span>
            </label>
          )}

          <label className="block space-y-1 text-sm font-medium text-gray-700">
            Mention complémentaire (optionnel)
            <textarea rows={3} className={inputClass} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </label>

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
