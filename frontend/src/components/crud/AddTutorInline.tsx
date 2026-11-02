"use client";

import { useState } from "react";
import api from "@/lib/axios";

/**
 * Ajout d'un tuteur directement depuis le formulaire d'un stage (liste « Tuteur »).
 * Le compte tuteur est créé tout de suite ; il définit son mot de passe via « Mot de passe oublié ».
 */

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export interface CreatedTutor {
  id: number;
  label: string;
}

export function AddTutorInline({ onCreated }: { onCreated: (tutor: CreatedTutor) => void }) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("TUTEUR_L3");
  const [otherLevel, setOtherLevel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setRole("TUTEUR_L3");
    setOtherLevel("");
    setError("");
  };

  const submit = async () => {
    setError("");

    if (!lastName.trim() || !email.trim()) {
      setError("Le nom et l'e-mail du tuteur sont obligatoires.");
      return;
    }

    if (role === "OTHER" && !otherLevel.trim()) {
      setError("Précisez le niveau du tuteur (Autre).");
      return;
    }

    setSaving(true);

    try {
      const res = await api.post("/internships/tutors", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        role,
        ...(role === "OTHER" ? { otherLevel: otherLevel.trim() } : {}),
      });

      const tutor = res.data?.data as CreatedTutor | undefined;

      if (tutor?.id) {
        onCreated(tutor);
        reset();
        setOpen(false);
      }
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || "Impossible d'ajouter le tuteur.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
      >
        + Ajouter un tuteur
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-3 rounded-2xl border border-dashed border-blue-300 bg-blue-50/40 p-4">
      <div>
        <p className="text-sm font-semibold text-gray-800">Nouveau tuteur (absent de la liste)</p>
        <p className="text-xs text-gray-500">
          Un compte tuteur est créé ; il définira son mot de passe via « Mot de passe oublié ».
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-1 text-sm font-medium text-gray-700">
          Prénom (facultatif)
          <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </label>
        <label className="block space-y-1 text-sm font-medium text-gray-700">
          Nom *
          <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </label>
        <label className="block space-y-1 text-sm font-medium text-gray-700">
          E-mail *
          <input
            type="email"
            className={inputClass}
            placeholder="prenom.nom@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm font-medium text-gray-700">
          Niveau
          <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="TUTEUR_L3">Tuteur L3</option>
            <option value="TUTEUR_M2">Tuteur M2</option>
            <option value="OTHER">Autre</option>
          </select>
        </label>

        {role === "OTHER" && (
          <label className="block space-y-1 text-sm font-medium text-gray-700 md:col-span-2">
            Précisez le niveau *
            <input
              className={inputClass}
              maxLength={80}
              placeholder="Ex. Doctorat, Expert, Ingénieur…"
              value={otherLevel}
              onChange={(e) => setOtherLevel(e.target.value)}
              autoFocus
            />
          </label>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={submit}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {saving ? "Ajout..." : "Ajouter le tuteur"}
        </button>
      </div>
    </div>
  );
}
