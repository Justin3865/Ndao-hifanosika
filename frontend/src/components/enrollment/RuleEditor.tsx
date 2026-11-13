"use client";

import { useState } from "react";
import { X } from "lucide-react";
import api from "@/lib/axios";
import { errorMessage } from "@/lib/crud";
import { toast } from "@/lib/toast";
import type { EnrollmentRule, ProjectQuota, SelectionSummary } from "@/lib/enrollment";

interface Props {
  project: ProjectQuota;
  onClose: () => void;
  onSaved: (selection: SelectionSummary | null) => void;
}

const toNumber = (v: string): number | null => (v.trim() === "" ? null : Number(v));

/** Critères d'éligibilité d'un projet : score IA minimum, sexe, âge, revenu, ménage, zone… */
export default function RuleEditor({ project, onClose, onSaved }: Props) {
  const [rule, setRule] = useState<EnrollmentRule>(project.rule);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof EnrollmentRule>(key: K, value: EnrollmentRule[K]) => setRule((cur) => ({ ...cur, [key]: value }));

  const numberField = (key: "ageMin" | "ageMax" | "maxMonthlyIncome" | "minHouseholdSize" | "minChildrenUnder5", label: string, hint?: string) => (
    <label className="block text-sm">
      <span className="mb-1 block text-gray-600">{label}</span>
      <input
        type="number"
        min={0}
        value={rule[key] ?? ""}
        onChange={(e) => set(key, toNumber(e.target.value))}
        placeholder={hint ?? "Pas de limite"}
        className="w-full rounded-xl border border-gray-300 px-3 py-2"
      />
    </label>
  );

  const save = async () => {
    setSaving(true);
    setError("");

    try {
      const res = await api.put(`/enrollment/rules/${project.projectId}`, rule);
      toast.success("Critères enregistrés");
      onSaved(res.data?.data?.selection ?? null);
    } catch (err) {
      setError(errorMessage(err, "Enregistrement impossible."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Critères de sélection</h2>
            <p className="text-sm text-gray-500">
              {project.name} · quota : {project.target ?? "non défini"} bénéficiaire(s)
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {project.target === null && (
          <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            Ce projet n&apos;a pas de quota (« bénéficiaires visés »). Renseignez-le dans la fiche du projet : sans quota, aucun candidat n&apos;est inscrit.
          </p>
        )}

        <div className="space-y-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
            <input type="checkbox" checked={rule.enabled} onChange={(e) => set("enabled", e.target.checked)} className="h-4 w-4" />
            Sélection active pour ce projet
          </label>

          <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-800">
            <input type="checkbox" checked={rule.autoEnroll} onChange={(e) => set("autoEnroll", e.target.checked)} className="mt-0.5 h-4 w-4" />
            <span>
              Inscription automatique : les candidats qui remplissent les critères et rentrent dans le quota deviennent bénéficiaires sans validation.
              <span className="block text-xs text-gray-500">Décochée : « en liste d’attente » jusqu’au lancement de la sélection.</span>
            </span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-gray-600">Score IA de départ (0-100)</span>
              <input type="number" min={0} max={100} value={rule.topScore} onChange={(e) => set("topScore", Number(e.target.value))} className="w-full rounded-xl border border-gray-300 px-3 py-2" />
              <span className="mt-1 block text-xs text-gray-500">Score minimum retenu en premier (70 par défaut).</span>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-gray-600">Score IA plancher (0-100)</span>
              <input type="number" min={0} max={100} value={rule.minScore} onChange={(e) => set("minScore", Number(e.target.value))} className="w-full rounded-xl border border-gray-300 px-3 py-2" />
              <span className="mt-1 block text-xs text-gray-500">Seuil abaissé de 5 en 5 jusqu’à ce plancher (50 par défaut).</span>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-gray-600">Public visé</span>
              <select value={rule.gender ?? ""} onChange={(e) => set("gender", (e.target.value || null) as EnrollmentRule["gender"])} className="w-full rounded-xl border border-gray-300 px-3 py-2">
                <option value="">Femmes et hommes</option>
                <option value="FEMALE">Femmes seulement</option>
                <option value="MALE">Hommes seulement</option>
              </select>
            </label>

            {numberField("ageMin", "Âge minimum")}
            {numberField("ageMax", "Âge maximum")}
            {numberField("maxMonthlyIncome", "Revenu mensuel maximum (Ar)")}
            {numberField("minHouseholdSize", "Taille minimale du ménage")}
            {numberField("minChildrenUnder5", "Enfants de moins de 5 ans (minimum)")}

            <label className="block text-sm">
              <span className="mb-1 block text-gray-600">Zone / localité contient</span>
              <input value={rule.localityContains ?? ""} onChange={(e) => set("localityContains", e.target.value || null)} placeholder="Ex. Ambatoharanana" className="w-full rounded-xl border border-gray-300 px-3 py-2" />
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={rule.requireDisability} onChange={(e) => set("requireDisability", e.target.checked)} className="h-4 w-4" />
              Handicap dans le ménage obligatoire
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={rule.requireVulnerable} onChange={(e) => set("requireVulnerable", e.target.checked)} className="h-4 w-4" />
              Ménage jugé vulnérable obligatoire
            </label>
          </div>

          <p className="rounded-xl bg-slate-50 p-3 text-xs text-gray-600">
            Les candidats qui remplissent tous les critères sont classés par score IA décroissant (puis ménage vulnérable, enfants de moins de 5 ans, date d&apos;enquête). Les premiers, dans la limite des places restantes du quota, deviennent bénéficiaires ; les suivants sont placés en liste d&apos;attente.
          </p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Annuler
            </button>
            <button type="button" disabled={saving} onClick={() => void save()} className="rounded-xl bg-blue-800 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-60">
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
