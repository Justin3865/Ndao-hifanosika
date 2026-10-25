"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Download, MapPin, MessageSquare, Send, Trash2, Upload } from "lucide-react";
import {
  ActivityComment,
  PARTICIPATION_COLORS,
  PARTICIPATION_LABELS,
  Participation,
  SpaceData,
  addComment,
  checkInActivity,
  decideParticipation,
  fetchSpace,
  fileToBase64,
  joinActivity,
  leaveActivity,
  openProof,
  rateParticipation,
  removeComment,
  saveProof,
  saveReport,
} from "@/lib/activitySpace";
import { errorMessage, fmtDateTime } from "@/lib/crud";
import { confirmDialog, toast } from "@/lib/toast";

const card = "mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm";
const input =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const primary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-800 disabled:opacity-60";
const secondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60";

const MAX_PROOF = 5 * 1024 * 1024;

function Badge({ status }: { status: Participation["status"] }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${PARTICIPATION_COLORS[status]}`}>
      {PARTICIPATION_LABELS[status]}
    </span>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ActivitySpace({ activity }: { activity: any }) {
  const activityId = Number(activity?.id);
  const [space, setSpace] = useState<SpaceData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      setSpace(await fetchSpace(activityId));
      setError("");
    } catch (err) {
      setError(errorMessage(err, "Impossible de charger l'espace de l'activité."));
    }
  }, [activityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (key: string, action: () => Promise<unknown>, success?: string) => {
    setBusy(key);

    try {
      await action();
      if (success) toast.success(success);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Action impossible."));
    } finally {
      setBusy("");
    }
  };

  if (error) return <p className="mt-6 text-sm text-red-600">{error}</p>;
  if (!space) return <p className="mt-6 text-sm text-gray-500">Chargement…</p>;

  return (
    <div>
      {space.canJoin && <MyParticipationCard activity={activity} space={space} busy={busy} run={run} />}
      {space.canManage && <ParticipantsCard space={space} busy={busy} run={run} />}
      <CommentsCard space={space} busy={busy} run={run} activityId={activityId} />
    </div>
  );
}

type RunFn = (key: string, action: () => Promise<unknown>, success?: string) => Promise<void>;

/* ------------------------------ stagiaire ------------------------------ */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MyParticipationCard({ activity, space, busy, run }: { activity: any; space: SpaceData; busy: string; run: RunFn }) {
  const mine = space.mine;
  const id = space.activityId;
  const [message, setMessage] = useState("");
  const [report, setReport] = useState(mine?.report ?? "");

  useEffect(() => setReport(mine?.report ?? ""), [mine?.report]);

  const closed = activity?.status === "CANCELLED" || activity?.status === "COMPLETED";

  const position = () =>
    new Promise<{ latitude: number; longitude: number } | undefined>((resolve) => {
      if (!navigator.geolocation) return resolve(undefined);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
        () => resolve(undefined),
        { enableHighAccuracy: true, timeout: 8000 },
      );
    });

  const upload = async (file?: File) => {
    if (!file) return;
    if (file.size > MAX_PROOF) return toast.error("Fichier trop volumineux (5 Mo maximum).");

    await run(
      "proof",
      async () => saveProof(id, { name: file.name, mime: file.type, data: await fileToBase64(file) }),
      "Preuve enregistrée.",
    );
  };

  return (
    <section className={card}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Ma participation</h2>
        {mine && <Badge status={mine.status} />}
      </div>

      {!mine && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Vous pouvez demander à participer à cette activité. Votre tuteur et le responsable seront prévenus.
          </p>
          <textarea
            className={input}
            rows={2}
            maxLength={500}
            placeholder="Message (facultatif) : motivation, disponibilité…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button
            type="button"
            disabled={busy === "join" || closed}
            onClick={() => run("join", () => joinActivity(id, message), "Demande envoyée.")}
            className={primary}
          >
            <Send className="h-4 w-4" />
            {closed ? "Activité clôturée" : "Je participe"}
          </button>
        </div>
      )}

      {mine?.status === "PENDING" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Votre demande est en attente de validation.</p>
          <button
            type="button"
            disabled={busy === "leave"}
            onClick={async () => {
              if (await confirmDialog("Annuler votre demande de participation ?")) {
                await run("leave", () => leaveActivity(id), "Demande annulée.");
              }
            }}
            className={secondary}
          >
            Annuler ma demande
          </button>
        </div>
      )}

      {mine?.status === "REJECTED" && (
        <p className="text-sm text-red-600">Votre demande a été refusée. Contactez votre tuteur pour plus d&apos;informations.</p>
      )}

      {mine?.status === "ACCEPTED" && (
        <div className="space-y-6">
          {typeof mine.rating === "number" && (
            <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
              <span className="font-semibold">Note de votre tuteur : {mine.rating}/100</span>
              {mine.ratingComment ? <span> — {mine.ratingComment}</span> : null}
            </div>
          )}

          {/* Présence */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-4">
            <div className="text-sm">
              <p className="font-medium text-gray-900">Présence</p>
              <p className="text-gray-500">
                {mine.checkedInAt ? `Pointée le ${fmtDateTime(mine.checkedInAt)}` : "Pointez votre présence le jour de l'activité."}
              </p>
            </div>
            {mine.checkedInAt ? (
              <span className="inline-flex items-center gap-2 text-sm font-medium text-green-700">
                <CheckCircle2 className="h-4 w-4" /> Présent
              </span>
            ) : (
              <button
                type="button"
                disabled={busy === "checkin"}
                onClick={() => run("checkin", async () => checkInActivity(id, await position()), "Présence enregistrée.")}
                className={primary}
              >
                <MapPin className="h-4 w-4" />
                Pointer ma présence
              </button>
            )}
          </div>

          {/* Rapport */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">Rapport de participation</p>
            <textarea
              className={input}
              rows={5}
              maxLength={8000}
              placeholder="Décrivez ce que vous avez fait, appris, les difficultés rencontrées…"
              value={report}
              onChange={(e) => setReport(e.target.value)}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-gray-500">
                {mine.reportAt ? `Dernier envoi : ${fmtDateTime(mine.reportAt)}` : "Pas encore rendu"}
              </span>
              <button
                type="button"
                disabled={busy === "report" || report.trim().length < 10}
                onClick={() => run("report", () => saveReport(id, report), "Rapport enregistré.")}
                className={primary}
              >
                Enregistrer le rapport
              </button>
            </div>
          </div>

          {/* Preuve */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900">Preuve / livrable (PDF, PNG, JPEG — 5 Mo max)</p>
            <div className="flex flex-wrap items-center gap-3">
              <label className={`${secondary} cursor-pointer`}>
                <Upload className="h-4 w-4" />
                {mine.hasProof ? "Remplacer le fichier" : "Ajouter un fichier"}
                <input
                  type="file"
                  className="hidden"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    void upload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              {mine.hasProof && (
                <button type="button" onClick={() => openProof(mine.id).catch(() => toast.error("Ouverture impossible."))} className={secondary}>
                  <Download className="h-4 w-4" />
                  {mine.proofName ?? "Voir ma preuve"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ------------------------------ encadrement ------------------------------ */

function ParticipantsCard({ space, busy, run }: { space: SpaceData; busy: string; run: RunFn }) {
  const [ratings, setRatings] = useState<Record<number, { value: string; comment: string }>>({});
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className={card}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Participants</h2>
        <span className="text-sm text-gray-500">{space.acceptedCount} accepté(s)</span>
      </div>

      {space.participants.length === 0 && <p className="text-sm text-gray-500">Aucune demande pour le moment.</p>}

      <div className="space-y-3">
        {space.participants.map((p) => {
          const draft = ratings[p.id] ?? { value: p.rating?.toString() ?? "", comment: p.ratingComment ?? "" };

          return (
            <div key={p.id} className="rounded-xl border border-gray-200 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {p.name} <span className="text-xs text-gray-500">({p.level})</span>
                  </p>
                  {p.message && <p className="text-gray-500">« {p.message} »</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge status={p.status} />
                  {p.status === "ACCEPTED" && (
                    <>
                      <span className={p.checkedInAt ? "text-green-700" : "text-gray-400"}>
                        {p.checkedInAt ? "✓ présent" : "absent"}
                      </span>
                      <span className={p.report ? "text-green-700" : "text-gray-400"}>{p.report ? "✓ rapport" : "pas de rapport"}</span>
                    </>
                  )}
                </div>
              </div>

              {p.status === "PENDING" && (
                <div className="mt-3 flex gap-2">
                  <button type="button" disabled={busy === `d${p.id}`} className={primary} onClick={() => run(`d${p.id}`, () => decideParticipation(p.id, "ACCEPTED"), "Participation acceptée.")}>
                    Accepter
                  </button>
                  <button type="button" disabled={busy === `d${p.id}`} className={secondary} onClick={() => run(`d${p.id}`, () => decideParticipation(p.id, "REJECTED"), "Participation refusée.")}>
                    Refuser
                  </button>
                </div>
              )}

              {p.status === "ACCEPTED" && (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {p.report && (
                      <button type="button" className={secondary} onClick={() => setOpen(open === p.id ? null : p.id)}>
                        {open === p.id ? "Masquer le rapport" : "Lire le rapport"}
                      </button>
                    )}
                    {p.hasProof && (
                      <button type="button" className={secondary} onClick={() => openProof(p.id).catch(() => toast.error("Ouverture impossible."))}>
                        <Download className="h-4 w-4" /> Preuve
                      </button>
                    )}
                  </div>

                  {open === p.id && p.report && (
                    <p className="whitespace-pre-wrap rounded-xl bg-gray-50 p-3 text-gray-700">{p.report}</p>
                  )}

                  <div className="flex flex-wrap items-end gap-2">
                    <label className="space-y-1 text-xs font-medium text-gray-600">
                      Note (0-100)
                      <input
                        type="number"
                        min={0}
                        max={100}
                        className={`${input} w-28`}
                        value={draft.value}
                        onChange={(e) => setRatings({ ...ratings, [p.id]: { ...draft, value: e.target.value } })}
                      />
                    </label>
                    <label className="min-w-[200px] flex-1 space-y-1 text-xs font-medium text-gray-600">
                      Commentaire
                      <input
                        className={input}
                        maxLength={500}
                        value={draft.comment}
                        onChange={(e) => setRatings({ ...ratings, [p.id]: { ...draft, comment: e.target.value } })}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={busy === `r${p.id}` || draft.value === "" || Number(draft.value) < 0 || Number(draft.value) > 100}
                      className={primary}
                      onClick={() => run(`r${p.id}`, () => rateParticipation(p.id, Number(draft.value), draft.comment), "Note enregistrée.")}
                    >
                      Noter
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------ commentaires ------------------------------ */

function CommentsCard({ space, busy, run, activityId }: { space: SpaceData; busy: string; run: RunFn; activityId: number }) {
  const [text, setText] = useState("");

  const roleHint = (c: ActivityComment) =>
    c.authorRole.startsWith("STAGIAIRE") ? "Stagiaire" : c.authorRole.startsWith("TUTEUR") ? "Tuteur" : "Équipe";

  return (
    <section className={card}>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
        <MessageSquare className="h-5 w-5" /> Commentaires
      </h2>

      <div className="space-y-3">
        {space.comments.length === 0 && <p className="text-sm text-gray-500">Aucun commentaire. Posez une question ou partagez une information.</p>}

        {space.comments.map((c) => (
          <div key={c.id} className="rounded-xl bg-gray-50 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-gray-900">
                {c.authorName} <span className="text-xs font-normal text-gray-500">· {roleHint(c)} · {fmtDateTime(c.createdAt)}</span>
              </p>
              {c.mine && (
                <button
                  type="button"
                  aria-label="Supprimer"
                  className="text-gray-400 hover:text-red-600"
                  onClick={() => run(`c${c.id}`, () => removeComment(c.id))}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-gray-700">{c.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className={input}
          maxLength={1000}
          placeholder="Écrire un commentaire…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim()) {
              const body = text;
              setText("");
              void run("comment", () => addComment(activityId, body));
            }
          }}
        />
        <button
          type="button"
          disabled={busy === "comment" || !text.trim()}
          className={primary}
          onClick={() => {
            const body = text;
            setText("");
            void run("comment", () => addComment(activityId, body));
          }}
        >
          <Send className="h-4 w-4" />
          Envoyer
        </button>
      </div>
    </section>
  );
}
