"use client";

// AJOUT — Anomalies de présence & note : chaque cas (ex. présence un jour férié) est vérifié par le tuteur / la RH
// AVANT d'entrer dans la note du stagiaire. La pénalité proposée est indicative, jamais appliquée automatiquement.

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

import { AppLayout } from "@/components/layout";
import api from "@/lib/axios";
import { errorMessage, fmtDateTime } from "@/lib/crud";
import { toast } from "@/lib/toast";

type Decision = "PENDING" | "IN_REVIEW" | "JUSTIFIED" | "CONFIRMED";

interface Counts { pending: number; inReview: number; justified: number; confirmed: number }
interface Summary { internshipId: number; title: string; studentName: string; counts: Counts; total: number; ready: boolean; penaltyPoints: number }
interface CaseRow { key: string; type: string; severity: "HIGH" | "MEDIUM" | "LOW"; title: string; detail: string; day: string | null; decision: Decision; comment: string; decidedBy: string | null; decidedAt: string | null }
interface Gate {
  internship: { id: number; title: string; studentName: string };
  cases: CaseRow[];
  counts: Counts;
  ready: boolean;
  canVerify: boolean;
  policy: { perCase: number; cap: number; scale: number };
  note: { current: number | null; penaltyPoints: number; recommended: number | null; scale: number };
  recommendations: string[];
}

const DECISION_STYLE: Record<Decision, string> = {
  PENDING: "bg-red-100 text-red-700",
  IN_REVIEW: "bg-amber-100 text-amber-700",
  JUSTIFIED: "bg-green-100 text-green-700",
  CONFIRMED: "bg-gray-200 text-gray-800",
};
const DECISION_LABEL: Record<Decision, string> = { PENDING: "À vérifier", IN_REVIEW: "En vérification", JUSTIFIED: "Justifiée", CONFIRMED: "Confirmée" };

function Content() {
  const params = useSearchParams();
  const internshipId = Number(params.get("internshipId")) || null;
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [gate, setGate] = useState<Gate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openKey, setOpenKey] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (internshipId) {
        const res = await api.get(`/note-anomalies/gate/${internshipId}`);
        setGate(res.data?.data ?? null);
      } else {
        const res = await api.get("/note-anomalies/summary");
        setSummaries(res.data?.data ?? []);
        setGate(null);
      }
    } catch (err) {
      setError(errorMessage(err, "Impossible de charger les anomalies de présence."));
    } finally {
      setLoading(false);
    }
  }, [internshipId]);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (key: string, decision: "JUSTIFIED" | "CONFIRMED" | "IN_REVIEW") => {
    if (decision === "JUSTIFIED" && comment.trim().length < 5) {
      toast.warning("Indiquez la justification (5 caractères minimum).");
      return;
    }
    setBusy(true);
    try {
      const res = await api.post("/note-anomalies/verify", { key, decision, comment });
      setGate(res.data?.data ?? null);
      setOpenKey("");
      setComment("");
      toast.success("Décision enregistrée.");
    } catch (err) {
      toast.error(errorMessage(err, "Enregistrement impossible."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">Anomalies de présence &amp; note</h1>
        <p className="text-sm text-gray-500">
          Une présence un jour non ouvrable (week-end, jour férié, fermeture) est signalée. Le tuteur ou la RH la justifie ou la confirme
          avant qu&apos;elle ne pèse sur la note. Aucune pénalité n&apos;est appliquée automatiquement.
        </p>
        {internshipId && <Link href="/note-anomalies" className="text-sm font-medium text-blue-700 hover:underline">← Tous les stages</Link>}
      </div>

      {loading && <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</div>}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {!loading && !error && !internshipId && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          {summaries.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-gray-600"><CheckCircle2 className="h-5 w-5 text-green-600" /> Aucune anomalie de présence à vérifier.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase text-gray-500">
                  <tr>{["Stagiaire", "Stage", "À vérifier", "Justifiés", "Confirmés", "Pénalité proposée", ""].map((h) => <th key={h} className="py-2 pr-4 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {summaries.map((s) => (
                    <tr key={s.internshipId}>
                      <td className="py-2.5 pr-4 font-medium text-gray-900">{s.studentName}</td>
                      <td className="pr-4 text-gray-600">{s.title}</td>
                      <td className="pr-4"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.ready ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{s.counts.pending + s.counts.inReview}</span></td>
                      <td className="pr-4">{s.counts.justified}</td>
                      <td className="pr-4">{s.counts.confirmed}</td>
                      <td className="pr-4">{s.penaltyPoints} pt /20</td>
                      <td><Link href={`/note-anomalies?internshipId=${s.internshipId}`} className="font-medium text-blue-700 hover:underline">Ouvrir</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!loading && !error && gate && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase text-gray-500">Stagiaire</p>
              <p className="mt-1 font-semibold text-gray-900">{gate.internship.studentName}</p>
              <p className="text-sm text-gray-500">{gate.internship.title}</p>
              <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${gate.ready ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {gate.ready ? "Note publiable" : "Vérification requise avant la note"}
              </span>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase text-gray-500">Note (sur {gate.note.scale})</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{gate.note.current ?? "—"}{gate.note.penaltyPoints > 0 && gate.note.recommended !== null && <span className="ml-2 text-base font-medium text-amber-700">→ {gate.note.recommended} (proposition)</span>}</p>
              <p className="text-xs text-gray-500">{gate.policy.perCase} pt par cas confirmé, plafond {gate.policy.cap} pt. À valider par la RH.</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm text-sm">
              <p>À vérifier : <b>{gate.counts.pending + gate.counts.inReview}</b></p>
              <p>Justifiés : <b>{gate.counts.justified}</b></p>
              <p>Confirmés : <b>{gate.counts.confirmed}</b></p>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <p className="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" /> Recommandations</p>
            <ul className="list-disc space-y-1 pl-5">{gate.recommendations.map((r) => <li key={r}>{r}</li>)}</ul>
          </div>

          <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white shadow-sm">
            {gate.cases.length === 0 && <p className="p-5 text-sm text-gray-500">Aucun cas.</p>}
            {gate.cases.map((c) => (
              <div key={c.key} className="space-y-2 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${DECISION_STYLE[c.decision]}`}>{DECISION_LABEL[c.decision]}</span>
                  <span className="font-medium text-gray-900">{c.title}</span>
                </div>
                <p className="text-sm text-gray-600">{c.detail}</p>
                {c.comment && <p className="text-sm text-gray-500">Commentaire : {c.comment}{c.decidedBy ? ` — ${c.decidedBy}` : ""}{c.decidedAt ? ` (${fmtDateTime(c.decidedAt)})` : ""}</p>}
                {gate.canVerify && (
                  openKey === c.key ? (
                    <div className="space-y-2">
                      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Justification (obligatoire pour « Justifier »)" className="w-full rounded-xl border border-gray-300 p-3 text-sm" />
                      <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={busy} onClick={() => void decide(c.key, "JUSTIFIED")} className="rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Justifier (aucun impact)</button>
                        <button type="button" disabled={busy} onClick={() => void decide(c.key, "CONFIRMED")} className="rounded-xl bg-gray-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">Confirmer l&apos;anomalie</button>
                        <button type="button" disabled={busy} onClick={() => void decide(c.key, "IN_REVIEW")} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-60">En vérification</button>
                        <button type="button" onClick={() => { setOpenKey(""); setComment(""); }} className="px-3 py-2 text-sm text-gray-500">Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => { setOpenKey(c.key); setComment(c.comment); }} className="text-sm font-medium text-blue-700 hover:underline">Vérifier ce cas</button>
                  )
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function NoteAnomaliesPage() {
  return (
    <AppLayout>
      <Suspense fallback={null}>
        <Content />
      </Suspense>
    </AppLayout>
  );
}
