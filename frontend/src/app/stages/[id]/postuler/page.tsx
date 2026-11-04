"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  MapPin,
  Paperclip,
  X,
} from "lucide-react";
import {
  InternshipOffer,
  apiRequest,
  formatDate,
  getStoredUser,
  isClosed,
} from "@/lib/stages";
import { sanitizePhone, phoneInputProps } from "@/lib/phone";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 Mo par fichier
const MAX_FILES = 5;
const MAX_TOTAL_BYTES = 7 * 1024 * 1024; // 7 Mo au total

type SlotKey = "cv" | "lettre" | "diplomes" | "releves" | "certificats";

/** Les 5 pièces du dossier de candidature (PDF uniquement). CV et lettre de motivation obligatoires. */
const DOC_SLOTS: { key: SlotKey; title: string; hint: string; required: boolean }[] = [
  { key: "cv", title: "CV – Curriculum Vitae", hint: "Curriculum vitae à jour (PDF)", required: true },
  { key: "lettre", title: "Lettre de motivation", hint: "Lettre personnalisée pour ce stage (PDF)", required: true },
  {
    key: "diplomes",
    title: "Diplômes et attestations",
    hint: "Diplômes, attestations de réussite ou de formation (PDF)",
    required: false,
  },
  { key: "releves", title: "Relevés de notes", hint: "Relevés de notes académiques (PDF)", required: false },
  {
    key: "certificats",
    title: "Certificats et recommandations",
    hint: "Certificats de formation et lettres de recommandation (PDF)",
    required: false,
  },
];

type DocEntry = { file: File; data: string | null; progress: number };
type DocState = Record<SlotKey, DocEntry | null>;

const EMPTY_DOCS: DocState = { cv: null, lettre: null, diplomes: null, releves: null, certificats: null };

/** Lit un fichier et renvoie son contenu en base64 (sans le préfixe data:), avec la progression (0-100) */
function readFileAsBase64(file: File, onProgress?: (percent: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    reader.onload = () => {
      const result = String(reader.result || "");
      onProgress?.(100);
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1B8FAE] focus:ring-2 focus:ring-[#1B8FAE]/20";

export default function PostulerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [offer, setOffer] = useState<InternshipOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [school, setSchool] = useState("");
  const [level, setLevel] = useState("");
  const [motivation, setMotivation] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [docs, setDocs] = useState<DocState>(EMPTY_DOCS);
  const [dossierNumber, setDossierNumber] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRefs = useRef<Partial<Record<SlotKey, HTMLInputElement | null>>>({});

  /* PAGE PUBLIQUE : aucun compte requis. Si le visiteur est déjà connecté, on pré-remplit. */
  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
      if (name) setFullName(name);
      if (user.email) setEmail(user.email);
    }
  }, []);

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        const data = await apiRequest(`/internship-offers/${id}`);
        setOffer(data.data ?? data);
      } catch (e: any) {
        setError(e?.message || "Ce stage est introuvable.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const picked = DOC_SLOTS.filter((slot) => docs[slot.key]);
  const totalSize = picked.reduce((sum, slot) => sum + (docs[slot.key]?.file.size ?? 0), 0);
  const remaining = Math.max(0, MAX_TOTAL_BYTES - totalSize);
  const usedPercent = Math.min(100, Math.round((totalSize / MAX_TOTAL_BYTES) * 100));
  const stillReading = picked.some((slot) => docs[slot.key]?.data === null);

  const handleSlotPicked = async (slot: SlotKey, list: FileList | null) => {
    setError("");
    const input = inputRefs.current[slot];
    const f = list && list.length > 0 ? list[0] : null;
    if (!f) return;

    const ext = f.name.split(".").pop()?.toLowerCase() || "";
    let isPdf = ext === "pdf";
    if (isPdf) {
      try {
        isPdf = (await f.slice(0, 4).text()) === "%PDF"; // vérifie le contenu, pas seulement l'extension
      } catch {
        isPdf = false;
      }
    }

    if (!isPdf) {
      setError(`« ${f.name} » : seul le format PDF est accepté.`);
    } else if (f.size === 0) {
      setError(`« ${f.name} » est vide.`);
    } else if (f.size > MAX_FILE_BYTES) {
      setError(`« ${f.name} » dépasse 5 Mo.`);
    } else {
      const others = DOC_SLOTS.filter((s) => s.key !== slot).reduce(
        (sum, s) => sum + (docs[s.key]?.file.size ?? 0),
        0
      );
      if (others + f.size > MAX_TOTAL_BYTES) {
        setError(`Les fichiers dépassent 7 Mo au total (il reste ${formatSize(Math.max(0, MAX_TOTAL_BYTES - others))}).`);
      } else {
        setDocs((cur) => ({ ...cur, [slot]: { file: f, data: null, progress: 0 } }));
        try {
          const data = await readFileAsBase64(f, (percent) =>
            setDocs((cur) => (cur[slot]?.file === f ? { ...cur, [slot]: { file: f, data: null, progress: percent } } : cur))
          );
          setDocs((cur) => (cur[slot]?.file === f ? { ...cur, [slot]: { file: f, data, progress: 100 } } : cur));
        } catch {
          setDocs((cur) => (cur[slot]?.file === f ? { ...cur, [slot]: null } : cur));
          setError(`Lecture de « ${f.name} » impossible. Réessayez.`);
        }
      }
    }

    if (input) input.value = "";
  };

  const copyDossierNumber = async () => {
    try {
      await navigator.clipboard.writeText(dossierNumber);
    } catch {
      // repli si le presse-papiers est indisponible (http, ancien navigateur)
      const ta = document.createElement("textarea");
      ta.value = dossierNumber;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const removeSlot = (slot: SlotKey) => {
    setDocs((cur) => ({ ...cur, [slot]: null }));
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("Veuillez indiquer votre nom complet.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Veuillez indiquer une adresse e-mail valide.");
      return;
    }
    if (!phone.trim()) {
      setError("Veuillez indiquer votre numéro de téléphone.");
      return;
    }
    for (const slot of DOC_SLOTS) {
      if (slot.required && !docs[slot.key]) {
        setError(`Veuillez joindre le document obligatoire : ${slot.title}.`);
        return;
      }
    }
    if (stillReading) {
      setError("Patientez : vos fichiers sont en cours de préparation.");
      return;
    }

    setSending(true);
    try {
      const encoded = DOC_SLOTS.filter((slot) => docs[slot.key]?.data).map((slot) => ({
        category: slot.key,
        name: docs[slot.key]!.file.name,
        type: "application/pdf",
        data: docs[slot.key]!.data as string,
      }));

      const res = await apiRequest(`/internship-offers/${id}/applications`, {
        method: "POST",
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          school: school.trim() || null,
          level: level.trim() || null,
          motivation: motivation.trim() || "Lettre de motivation jointe en PDF.",
          files: encoded,
        }),
      });
      setDossierNumber(res?.data?.dossierNumber || "");
      setSent(true);
    } catch (e: any) {
      setError(e?.message || "Impossible d'envoyer votre candidature.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/stages"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-[#1F5FA0]"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>

        {loading && (
          <p className="mt-10 text-center text-sm text-gray-500">
            Chargement...
          </p>
        )}

        {!loading && !offer && (
          <div className="mt-8 rounded-2xl border border-[#D01C7F]/30 bg-[#D01C7F]/5 p-6 text-center text-sm text-[#D01C7F]">
            {error || "Ce stage est introuvable."}
          </div>
        )}

        {offer && (
          <>
            <div className="mt-6 rounded-2xl border border-[#1B8FAE]/20 bg-white p-6 shadow-sm">
              <h1 className="text-2xl font-bold">{offer.title}</h1>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                {offer.description}
              </p>
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
                {offer.location && (
                  <li className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#1B8FAE]" />
                    {offer.location}
                  </li>
                )}
                {offer.duration && (
                  <li className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#1B8FAE]" />
                    {offer.duration}
                  </li>
                )}
                {offer.deadline && (
                  <li
                    className={`flex items-center gap-2 font-medium ${
                      isClosed(offer) ? "text-red-500" : "text-emerald-500"
                    }`}
                  >
                    <Calendar className="h-4 w-4" />
                    Date limite : {formatDate(offer.deadline)}
                  </li>
                )}
              </ul>
            </div>

            {sent ? (
              <div className="mt-6 rounded-2xl border border-[#1B8FAE]/30 bg-white p-8 text-center shadow-sm">
                <CheckCircle2 className="mx-auto h-12 w-12 text-[#1B8FAE]" />
                <h2 className="mt-4 text-xl font-bold">Dossier envoyé</h2>
                <p className="mx-auto mt-3 max-w-md text-center text-sm leading-6 text-gray-600 dark:text-slate-100">
                  Votre dossier est en cours d&apos;examen par le responsable.
                  Il vous contactera si votre candidature est retenue.
                </p>

                {dossierNumber && (
                  <div className="mt-5 rounded-xl bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-200">
                      Numéro de votre dossier
                    </p>
                    <div className="mt-1 flex items-center justify-center gap-2">
                      <p className="break-all font-mono text-base font-bold text-[#1F5FA0] select-all dark:text-sky-300">
                        {dossierNumber}
                      </p>
                      <button
                        type="button"
                        onClick={copyDossierNumber}
                        aria-label="Copier le numéro de dossier"
                        title="Copier"
                        className="shrink-0 rounded-lg border border-gray-300 p-1.5 text-gray-500 transition hover:border-[#1B8FAE] hover:text-[#1B8FAE] dark:text-slate-100"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {copied && (
                      <p className="mt-1 text-xs font-medium text-emerald-500">Numéro copié</p>
                    )}
                    <p className="mt-1 text-center text-xs text-gray-500 dark:text-slate-300">
                      Conservez ce numéro pour tout échange avec le responsable.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => router.push("/stages")}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1F5FA0] px-5 py-3 text-sm font-bold text-white hover:bg-[#194d82]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </button>
              </div>
            ) : isClosed(offer) ? (
              <div className="mt-6 rounded-2xl bg-red-50 p-6 text-center text-sm font-semibold text-red-600">
                Candidature terminée : les candidatures pour ce stage sont fermées.
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="mt-6 space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <h2 className="text-lg font-bold">Votre candidature</h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Nom complet *
                    </label>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                      placeholder="Nom et prénoms"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      E-mail *
                    </label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      autoComplete="email"
                      placeholder="exemple@gmail.com"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Téléphone *
                    </label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(sanitizePhone(e.target.value))}
                      type="tel"
                      {...phoneInputProps}
                      placeholder="034 00 000 00"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Niveau d&apos;études
                    </label>
                    <input
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                      placeholder="Ex : Licence 3"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Établissement
                  </label>
                  <input
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="Université / école"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Message complémentaire (facultatif)
                  </label>
                  <textarea
                    rows={4}
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    placeholder="Ajoutez un message pour le responsable si vous le souhaitez..."
                    className={inputClass}
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Votre dossier de candidature *
                    </label>
                    <span className="text-xs font-medium text-gray-500">
                      {picked.length}/{MAX_FILES} fichiers
                    </span>
                  </div>

                  <div className="space-y-3">
                    {DOC_SLOTS.map((slot) => {
                      const entry = docs[slot.key];
                      const ready = !!entry && entry.data !== null;

                      return (
                        <div key={slot.key} className="rounded-xl border border-gray-300 bg-white p-3">
                          <input
                            ref={(el) => {
                              inputRefs.current[slot.key] = el;
                            }}
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={(e) => void handleSlotPicked(slot.key, e.target.files)}
                            className="hidden"
                          />

                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold">{slot.title}</p>
                              <p className="text-xs text-gray-500">{slot.hint}</p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                slot.required ? "bg-[#D01C7F]/10 text-[#D01C7F]" : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {slot.required ? "Obligatoire" : "Facultatif"}
                            </span>
                          </div>

                          {!entry ? (
                            <button
                              type="button"
                              onClick={() => inputRefs.current[slot.key]?.click()}
                              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-600 hover:border-[#1B8FAE] hover:text-[#1B8FAE]"
                            >
                              <Paperclip className="h-4 w-4" />
                              Choisir un fichier
                            </button>
                          ) : (
                            <div className="mt-3">
                              <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="flex min-w-0 items-center gap-2">
                                  {ready ? (
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                                  ) : (
                                    <Paperclip className="h-4 w-4 shrink-0 text-[#1B8FAE]" />
                                  )}
                                  <span className="truncate">{entry.file.name}</span>
                                  <span className="shrink-0 text-xs text-gray-400">{formatSize(entry.file.size)}</span>
                                </span>
                                <span className="flex shrink-0 items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => inputRefs.current[slot.key]?.click()}
                                    className="rounded-lg px-2 py-1 text-xs font-medium text-[#1B8FAE] hover:bg-gray-100"
                                  >
                                    Remplacer
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeSlot(slot.key)}
                                    aria-label={`Retirer ${slot.title}`}
                                    className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-[#D01C7F]"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </span>
                              </div>

                              <div
                                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200"
                                role="progressbar"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={entry.progress}
                              >
                                <div
                                  className={`h-full rounded-full transition-all ${ready ? "bg-emerald-500" : "bg-[#1B8FAE]"}`}
                                  style={{ width: `${entry.progress}%` }}
                                />
                              </div>
                              <p className="mt-1 text-[11px] text-gray-500">
                                {ready ? "Prêt à être envoyé" : `Préparation… ${entry.progress}%`}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {formatSize(totalSize)} utilisés sur {formatSize(MAX_TOTAL_BYTES)}
                      </span>
                      <span className="font-medium">Il reste {formatSize(remaining)}</span>
                    </div>
                    <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full rounded-full transition-all ${usedPercent >= 90 ? "bg-[#D01C7F]" : "bg-[#1B8FAE]"}`}
                        style={{ width: `${usedPercent}%` }}
                      />
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-gray-500 dark:text-slate-300">
                    PDF uniquement — 5 Mo maximum par fichier, {MAX_FILES} fichiers et 7 Mo au total. CV et lettre de
                    motivation obligatoires.
                  </p>
                </div>

                {error && (
                  <p className="rounded-xl bg-[#D01C7F]/10 px-4 py-3 text-sm text-[#D01C7F]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={sending || stillReading}
                  className="w-full rounded-xl bg-[#1F5FA0] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#194d82] disabled:opacity-60"
                >
                  {sending ? "Envoi en cours..." : "Envoyer ma candidature"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}
