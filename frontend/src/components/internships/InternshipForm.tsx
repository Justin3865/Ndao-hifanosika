"use client";

import { useState } from "react";

interface InternshipFormProps {
  onSubmit?: (data: Record<string, string>) => void;
  onCancel?: () => void;
}

export default function InternshipForm({
  onSubmit,
  onCancel,
}: InternshipFormProps) {
  const [form, setForm] = useState({
    internName: "",
    institution: "",
    email: "",
    phone: "",
    project: "",
    department: "",
    supervisor: "",
    startDate: "",
    endDate: "",
    type: "Professionnel",
    description: "",
  });

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit?.(form);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border bg-white p-6 shadow-sm"
    >
      <div className="mb-6">
        <h2 className="text-xl font-semibold">
          Nouveau stage
        </h2>

        <p className="text-sm text-gray-500">
          Enregistrer un nouveau stagiaire et sa période de stage.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Nom du stagiaire
          </label>

          <input
            name="internName"
            value={form.internName}
            onChange={handleChange}
            required
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Institution
          </label>

          <input
            name="institution"
            value={form.institution}
            onChange={handleChange}
            required
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Email
          </label>

          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Téléphone
          </label>

          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full rounded-lg border px-3 py-2"
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
            <option value="Maison Digitale">
              Maison Digitale
            </option>
            <option value="Kids Preneur">
              Kids Preneur
            </option>
            <option value="Ankizy Innov">
              Ankizy Innov
            </option>
            <option value="Otrikasa">Otrikasa</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Département
          </label>

          <select
            name="department"
            value={form.department}
            onChange={handleChange}
            required
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="">Sélectionner</option>
            <option value="Direction">Direction</option>
            <option value="DSI">DSI</option>
            <option value="DAF">DAF</option>
            <option value="Communication">
              Communication
            </option>
            <option value="RH">RH</option>
            <option value="S&E">S&E</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Encadrant
          </label>

          <input
            name="supervisor"
            value={form.supervisor}
            onChange={handleChange}
            required
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Type de stage
          </label>

          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="w-full rounded-lg border px-3 py-2"
          >
            <option value="Professionnel">
              Professionnel
            </option>
            <option value="Académique">
              Académique
            </option>
            <option value="Observation">
              Observation
            </option>
            <option value="PFE">PFE</option>
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
            Description / Objectifs
          </label>

          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border px-4 py-2"
        >
          Annuler
        </button>

        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700"
        >
          Enregistrer le stage
        </button>
      </div>
    </form>
  );
}