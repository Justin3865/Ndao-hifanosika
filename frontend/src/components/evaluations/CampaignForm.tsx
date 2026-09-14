"use client";

import { useState } from "react";

interface CampaignFormProps {
  onSubmit?: (data: Record<string, string>) => void;
  onCancel?: () => void;
}

export default function CampaignForm({
  onSubmit,
  onCancel,
}: CampaignFormProps) {
  const [form, setForm] = useState({
    name: "",
    project: "",
    type: "Performance",
    startDate: "",
    endDate: "",
    description: "",
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
      <h2 className="mb-1 text-xl font-semibold">
        Nouvelle campagne d'évaluation
      </h2>

      <p className="mb-6 text-sm text-gray-500">
        Configurez une nouvelle campagne de suivi et d'évaluation.
      </p>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Nom de la campagne
          </label>

          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
            placeholder="Ex: Évaluation annuelle 2026"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Projet / Programme
          </label>

          <select
            name="project"
            value={form.project}
            onChange={handleChange}
            required
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="">Sélectionner</option>
            <option value="Maison Digitale">Maison Digitale</option>
            <option value="Kids Preneur">Kids Preneur</option>
            <option value="Ankizy Innov">Ankizy Innov</option>
            <option value="Otrikasa">Otrikasa</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Type d'évaluation
          </label>

          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="Performance">Performance</option>
            <option value="Projet">Projet</option>
            <option value="Programme">Programme</option>
            <option value="Équipe">Équipe</option>
            <option value="Bénéficiaire">Bénéficiaire</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Date de début
          </label>

          <input
            type="date"
            name="startDate"
            value={form.startDate}
            onChange={handleChange}
            required
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Date de fin
          </label>

          <input
            type="date"
            name="endDate"
            value={form.endDate}
            onChange={handleChange}
            required
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-medium">
            Description
          </label>

          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            className="w-full rounded-lg border px-3 py-2"
            placeholder="Description de la campagne..."
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border px-4 py-2 text-sm"
        >
          Annuler
        </button>

        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Créer la campagne
        </button>
      </div>
    </form>
  );
}