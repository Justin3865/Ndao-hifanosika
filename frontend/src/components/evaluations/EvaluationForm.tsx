"use client";

import { useState } from "react";

interface EvaluationFormProps {
  onSubmit?: (data: Record<string, string>) => void;
}

export default function EvaluationForm({
  onSubmit,
}: EvaluationFormProps) {
  const [form, setForm] = useState({
    campaign: "",
    evaluator: "",
    target: "",
    date: "",
    comment: "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(form);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border bg-white p-6 shadow-sm"
    >
      <h2 className="text-xl font-semibold">
        Nouvelle évaluation
      </h2>

      <p className="mb-6 text-sm text-gray-500">
        Saisissez les informations de l'évaluation.
      </p>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Campagne
          </label>

          <select
            name="campaign"
            value={form.campaign}
            onChange={handleChange}
            required
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="">Sélectionner</option>
            <option value="CAMP-001">
              Évaluation annuelle 2026
            </option>
            <option value="CAMP-002">
              Évaluation Kids Preneur
            </option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Évaluateur
          </label>

          <input
            name="evaluator"
            value={form.evaluator}
            onChange={handleChange}
            required
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Nom de l'évaluateur"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Personne / équipe évaluée
          </label>

          <input
            name="target"
            value={form.target}
            onChange={handleChange}
            required
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Nom ou équipe"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Date
          </label>

          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            required
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">
            Commentaire
          </label>

          <textarea
            name="comment"
            value={form.comment}
            onChange={handleChange}
            rows={4}
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700"
        >
          Enregistrer
        </button>
      </div>
    </form>
  );
}