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
const ACCEPTED_EXT = ["pdf", "doc", "docx", "png", "jpg", "jpeg"];

/** Lit un fichier et renvoie son contenu en base64 (sans le préfixe data:) */
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
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
  const [files, setFiles] = useState<File[]>([]);
  const [dossierNumber, setDossierNumber] = useState("");
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  const handleFilesPicked = (picked: FileList | null) => {
    setError("");
    if (!picked || picked.length === 0) return;

    const next = [...files];
    for (const f of Array.from(picked)) {
      const ext = f.name.split(".").pop()?.toLowerCase() || "";
      if (!ACCEPTED_EXT.includes(ext)) {
        setError(`« ${f.name} » : format non accepté (PDF, Word, PNG ou JPG).`);
        continue;
      }
      if (f.size > MAX_FILE_BYTES) {
        setError(`« ${f.name} » dépasse 5 Mo.`);
        continue;
      }
      if (next.some((x) => x.name === f.name && x.size === f.size)) continue;
      if (next.length >= MAX_FILES) {
        setError(`Maximum ${MAX_FILES} fichiers.`);
        break;
      }
      if (next.reduce((sum, x) => sum + x.size, 0) + f.size > MAX_TOTAL_BYTES) {
        setError("Les fichiers dépassent 7 Mo au total.");
        continue;
      }
      next.push(f);
    }
    setFiles(next);
    if (fileInputRef.current) fileInputRef.current.value = "";
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

  const removeFile = (index: number) => {
    setFiles((list) => list.filter((_, i) => i !== index));
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
    if (!motivation.trim()) {
      setError("Veuillez rédiger votre lettre de motivation.");
      return;
    }
    if (files.length === 0) {
      setError("Veuillez sélectionner votre dossier (au moins un fichier) avant d'envoyer.");
      return;
    }

    setSending(true);
    try {
      const encoded = await Promise.all(
        files.map(async (f) => ({
          name: f.name,
          type: f.type,
          data: await readFileAsBase64(f),
        }))
      );

      const res = await apiRequest(`/internship-offers/${id}/applications`, {
        method: "POST",
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          school: school.trim() || null,
          level: level.trim() || null,
          motivation: motivation.trim(),
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
                    Lettre de motivation *
                  </label>
                  <textarea
                    rows={6}
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    placeholder="Expliquez pourquoi ce stage vous intéresse..."
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Votre dossier (CV, diplômes...) *
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    onChange={(e) => handleFilesPicked(e.target.files)}
                    className="hidden"
                  />
                  <div className="space-y-2">
                    {files.map((f, i) => (
                      <div
                        key={`${f.name}-${i}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Paperclip className="h-4 w-4 shrink-0 text-[#1B8FAE]" />
                          <span className="truncate">{f.name}</span>
                          <span className="shrink-0 text-xs text-gray-400">
                            {formatSize(f.size)}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          aria-label="Retirer le fichier"
                          className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-[#D01C7F]"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {files.length < MAX_FILES && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-3 py-3 text-sm font-medium text-gray-600 hover:border-[#1B8FAE] hover:text-[#1B8FAE]"
                      >
                        <Paperclip className="h-4 w-4" />
                        {files.length === 0 ? "Sélectionner un fichier" : "Ajouter un autre fichier"}
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-300">
                    PDF, Word, PNG ou JPG — 5 Mo maximum par fichier, {MAX_FILES} fichiers et 7 Mo au total
                    {files.length > 0 ? ` (${formatSize(totalSize)} utilisés)` : ""}.
                  </p>
                </div>

                {error && (
                  <p className="rounded-xl bg-[#D01C7F]/10 px-4 py-3 text-sm text-[#D01C7F]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full rounded-xl bg-[#1F5FA0] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#194d82] disabled:opacity-60"
                >
                  {sending ? "Envoi..." : "Envoyer ma candidature"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}
