"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { errorMessage } from "@/lib/crud";
import { Criterion, FeedbackKind, addFeedback } from "@/lib/finalEvaluation";
import { toast } from "@/lib/toast";

interface Props {
  projectId: number;
  kind: FeedbackKind;
  criteria: Criterion[];
  partners: Array<{ id: number; name: string }>;
  beneficiaries: Array<{ id: number; name: string }>;
  onSaved: () => void;
  onCancel: () => void;
}

const input = "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500";

export function FeedbackForm({ projectId, kind, criteria, partners, beneficiaries, onSaved, onCancel }: Props) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [partnerId, setPartnerId] = useState("");
  const [beneficiaryId, setBeneficiaryId] = useState("");
  const [respondent, setRespondent] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const complete = criteria.every((criterion) => ratings[criterion.key] >= 1);
  const ready = complete && (kind === "BENEFICIARY" || partnerId !== "");

  const submit = async () => {
    setSaving(true);

    try {
      await addFeedback(projectId, {
        kind,
        ratings,
        respondent: respondent.trim() || undefined,
        comment: comment.trim() || undefined,
        ...(kind === "PARTNER" ? { partnerId: Number(partnerId) } : { beneficiaryId: beneficiaryId ? Number(beneficiaryId) : null }),
      });
      toast.success("Avis enregistré : la note du projet est recalculée.");
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err, "Impossible d'enregistrer l'avis."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
      <p className="text-sm font-semibold text-gray-900">
        {kind === "PARTNER" ? "Questionnaire du partenaire : la méthode de travail de l'ONG vous convient-elle ?" : "Questionnaire du bénéficiaire : êtes-vous satisfait du projet ?"}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {kind === "PARTNER" ? (
          <select className={input} value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
            <option value="">— Partenaire interrogé —</option>
            {partners.map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.name}
              </option>
            ))}
          </select>
        ) : (
          <select className={input} value={beneficiaryId} onChange={(e) => setBeneficiaryId(e.target.value)}>
            <option value="">Anonyme (bénéficiaire non identifié)</option>
            {beneficiaries.map((beneficiary) => (
              <option key={beneficiary.id} value={beneficiary.id}>
                {beneficiary.name}
              </option>
            ))}
          </select>
        )}

        <input
          className={input}
          placeholder={kind === "PARTNER" ? "Nom du représentant (facultatif)" : "Nom / précision (facultatif)"}
          value={respondent}
          maxLength={120}
          onChange={(e) => setRespondent(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {criteria.map((criterion) => (
          <div key={criterion.key} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-gray-800">{criterion.label}</span>
            <div className="flex gap-1" role="radiogroup" aria-label={criterion.label}>
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={ratings[criterion.key] === value}
                  aria-label={`${value} sur 5`}
                  onClick={() => setRatings((current) => ({ ...current, [criterion.key]: value }))}
                  className="rounded-lg p-1 transition hover:bg-amber-100"
                >
                  <Star className={`h-6 w-6 ${(ratings[criterion.key] ?? 0) >= value ? "fill-amber-400 text-amber-500" : "text-gray-300"}`} />
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="text-xs text-gray-500">1 = très insatisfait · 5 = très satisfait</p>
      </div>

      <textarea className={input} rows={3} maxLength={2000} placeholder="Commentaire (facultatif)" value={comment} onChange={(e) => setComment(e.target.value)} />

      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Annuler
        </button>
        <button
          type="button"
          disabled={!ready || saving}
          onClick={submit}
          className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
        >
          {saving ? "Enregistrement…" : "Enregistrer l'avis"}
        </button>
      </div>
    </div>
  );
}
