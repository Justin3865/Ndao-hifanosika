"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Download, FileText, Loader2, RotateCcw, Search, Trash2, Upload } from "lucide-react";

import { AppLayout } from "@/components/layout";
import { getStoredRole } from "@/lib/access";
import api from "@/lib/axios";
import { errorMessage, fmtDate } from "@/lib/crud";
import {
  DOC_KIND_LABEL,
  DocKind,
  InternshipDocRow,
  fileToBase64,
  fmtSize,
  saveBlob,
} from "@/lib/gaps";

interface InternshipOption {
  id: number;
  title: string;
  student?: { firstName: string; lastName: string } | null;
}

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = ".pdf,.doc,.docx,.png,.jpg,.jpeg";
const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

const KIND_STYLE: Record<DocKind, string> = {
  CONVENTION: "bg-blue-100 text-blue-800",
  REPORT: "bg-amber-100 text-amber-800",
  MEMOIRE: "bg-purple-100 text-purple-800",
  OTHER: "bg-gray-100 text-gray-700",
};

/** Date locale (jour) au format YYYY-MM-DD, pour comparer avec les <input type="date">. */
const dayKey = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const norm = (v: string | undefined | null) =>
  (v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export default function InternshipDocumentsPage() {
  const [role, setRole] = useState("");
  const [internships, setInternships] = useState<InternshipOption[]>([]);
  const [internshipId, setInternshipId] = useState("");
  const [docs, setDocs] = useState<InternshipDocRow[]>([]);
  const [kind, setKind] = useState<DocKind>("REPORT");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Filtres
  const [fOwner, setFOwner] = useState("");
  const [fTheme, setFTheme] = useState("");
  const [fLevel, setFLevel] = useState("");
  const [fKind, setFKind] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");

  useEffect(() => {
    setRole(getStoredRole());
    api
      .get("/internships")
      .then((res) => {
        const list: InternshipOption[] = res.data?.data ?? [];
        setInternships(list);
        if (list.length === 1) setInternshipId(String(list[0].id));
      })
      .catch((err) => setError(errorMessage(err, "Impossible de charger les stages.")));
  }, []);

  // Liste globale : tous les documents que l'utilisateur a le droit de voir (pas besoin de choisir un stage d'abord)
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/internship-documents");
      setDocs(res.data?.data ?? []);
    } catch (err) {
      setError(errorMessage(err, "Impossible de charger les documents."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const levels = useMemo(
    () => Array.from(new Set(docs.map((d) => d.level).filter((v): v is string => !!v))).sort(),
    [docs],
  );

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      if (internshipId && String(d.internshipId) !== internshipId) return false;
      if (fOwner && !norm(d.ownerName).includes(norm(fOwner))) return false;
      if (fTheme && !norm(`${d.theme ?? ""} ${d.internshipTitle ?? ""}`).includes(norm(fTheme))) return false;
      if (fLevel && (d.level ?? "") !== fLevel) return false;
      if (fKind && d.kind !== fKind) return false;
      const day = dayKey(d.createdAt);
      if (fFrom && day < fFrom) return false;
      if (fTo && day > fTo) return false;
      return true;
    });
  }, [docs, internshipId, fOwner, fTheme, fLevel, fKind, fFrom, fTo]);

  const hasFilter = !!(internshipId || fOwner || fTheme || fLevel || fKind || fFrom || fTo);
  const resetFilters = () => {
    setInternshipId("");
    setFOwner("");
    setFTheme("");
    setFLevel("");
    setFKind("");
    setFFrom("");
    setFTo("");
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !internshipId) return;
    setError("");
    setInfo("");
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const mime = file.type || MIME_BY_EXT[ext] || "";
    if (!Object.values(MIME_BY_EXT).includes(mime)) {
      setError("Format non accepté (PDF, Word, PNG ou JPEG).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Fichier trop volumineux (8 Mo maximum).");
      return;
    }
    setUploading(true);
    try {
      const data = await fileToBase64(file);
      await api.post("/internship-documents", {
        internshipId: Number(internshipId),
        kind,
        name: file.name,
        mime,
        data,
        note: note.trim() || undefined,
      });
      setNote("");
      setInfo("Document déposé.");
      await load();
    } catch (err) {
      setError(errorMessage(err, "Dépôt impossible."));
    } finally {
      setUploading(false);
    }
  };

  const download = async (doc: InternshipDocRow) => {
    try {
      const res = await api.get(`/internship-documents/${doc.id}/download`, { responseType: "blob" });
      saveBlob(res.data as Blob, doc.name);
    } catch (err) {
      setError(errorMessage(err, "Téléchargement impossible."));
    }
  };

  const remove = async (doc: InternshipDocRow) => {
    if (!window.confirm(`Supprimer « ${doc.name} » ?`)) return;
    try {
      await api.delete(`/internship-documents/${doc.id}`);
      setInfo("Document supprimé.");
      await load();
    } catch (err) {
      setError(errorMessage(err, "Suppression impossible."));
    }
  };

  const field = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm";
  const label = "mb-1 block text-xs font-medium text-gray-600";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents de stage</h1>
          <p className="text-sm text-gray-500">Convention de stage, rapport et mémoire. Formats acceptés : PDF, Word, PNG, JPEG (8 Mo maximum).</p>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {info && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{info}</div>}

        {/* Filtres */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className={label}>Propriétaire du document</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input value={fOwner} onChange={(e) => setFOwner(e.target.value)} placeholder="Nom du stagiaire" className={`${field} pl-9`} />
              </div>
            </label>
            <label className="block">
              <span className={label}>Thème</span>
              <input value={fTheme} onChange={(e) => setFTheme(e.target.value)} placeholder="Thème du stage" className={field} />
            </label>
            <label className="block">
              <span className={label}>Niveau</span>
              <select value={fLevel} onChange={(e) => setFLevel(e.target.value)} className={field}>
                <option value="">Tous les niveaux</option>
                {levels.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>Type de document</span>
              <select value={fKind} onChange={(e) => setFKind(e.target.value)} className={field}>
                <option value="">Tous les types</option>
                {(Object.keys(DOC_KIND_LABEL) as DocKind[]).map((k) => (
                  <option key={k} value={k}>{DOC_KIND_LABEL[k]}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={label}>Déposé à partir du</span>
              <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} className={field} />
            </label>
            <label className="block">
              <span className={label}>Déposé jusqu'au</span>
              <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} className={field} />
            </label>
            <label className="block sm:col-span-2">
              <span className={label}>Stage (filtre et destination du dépôt)</span>
              <select value={internshipId} onChange={(e) => setInternshipId(e.target.value)} className={field}>
                <option value="">— Tous les stages —</option>
                {internships.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.title}{i.student ? ` — ${i.student.firstName} ${i.student.lastName}` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {hasFilter && (
            <button type="button" onClick={resetFilters} className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline">
              <RotateCcw className="h-4 w-4" /> Réinitialiser les filtres
            </button>
          )}
        </div>

        {/* Dépôt : visible dès qu'un stage est choisi */}
        {internshipId ? (
          <div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-3">
            <select value={kind} onChange={(e) => setKind(e.target.value as DocKind)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {(Object.keys(DOC_KIND_LABEL) as DocKind[]).map((k) => (
                <option key={k} value={k}>{DOC_KIND_LABEL[k]}</option>
              ))}
            </select>
            <input placeholder="Note (facultatif)" value={note} onChange={(e) => setNote(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Déposer un fichier
              <input type="file" accept={ACCEPT} onChange={onFile} disabled={uploading} className="hidden" />
            </label>
          </div>
        ) : (
          <p className="text-xs text-gray-500">Choisissez un stage ci-dessus pour déposer un document.</p>
        )}

        {/* Tableau */}
        <div className="rounded-2xl border border-gray-200 bg-white">
          {loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-blue-700" /></div>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">
              {docs.length === 0 ? "Aucun document déposé." : "Aucun document ne correspond aux filtres."}
            </p>
          ) : (
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col style={{ width: "17%" }} />
                <col style={{ width: "21%" }} />
                <col style={{ width: "6%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "23%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "10%" }} />
              </colgroup>
              <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 [&_th]:whitespace-nowrap">
                <tr>
                  <th className="px-4 py-3">Propriétaire</th>
                  <th className="px-4 py-3">Thème</th>
                  <th className="px-4 py-3">Niveau</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Fichier</th>
                  <th className="px-4 py-3">Date de dépôt</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((d) => (
                  <tr key={d.id} className="align-middle">
                    <td className="truncate whitespace-nowrap px-4 py-3 font-medium text-gray-900" title={d.ownerName || undefined}>{d.ownerName || "—"}</td>
                    <td className="truncate whitespace-nowrap px-4 py-3 text-gray-700" title={d.theme || undefined}>{d.theme || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{d.level || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${KIND_STYLE[d.kind] ?? KIND_STYLE.OTHER}`}>
                        {DOC_KIND_LABEL[d.kind] ?? d.kind}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-blue-700" />
                        <div className="min-w-0">
                          <p className="truncate whitespace-nowrap font-medium text-gray-900" title={d.name}>{d.name}</p>
                          <p className="truncate whitespace-nowrap text-xs text-gray-500" title={d.note || undefined}>{fmtSize(d.size)}{d.note ? ` · ${d.note}` : ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{fmtDate(d.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1 whitespace-nowrap">
                        <button type="button" onClick={() => download(d)} className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-700" aria-label="Télécharger">
                          <Download className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => remove(d)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {role === "" ? null : (
          <p className="text-xs text-gray-500">{filtered.length} document(s) affiché(s) sur {docs.length}.</p>
        )}
      </div>
    </AppLayout>
  );
}
