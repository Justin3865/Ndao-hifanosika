"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  STATUS_LABELS,
} from "@/lib/roles";
import {
  ApiDepartment,
  ApiUser,
  UserPayload,
  fetchDepartments,
} from "@/lib/usersApi";

interface Props {
  mode: "create" | "edit";
  initial?: ApiUser | null;
  submitting: boolean;
  error: string;
  onSubmit: (payload: UserPayload) => void;
}

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export function UserEditorForm({
  mode,
  initial,
  submitting,
  error,
  onSubmit,
}: Props) {
  const isEdit = mode === "edit";
  const isAdminAccount = initial?.role === "ADMIN";

  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [localError, setLocalError] = useState("");

  const [form, setForm] = useState({
    firstName: initial?.firstName ?? "",
    lastName: initial?.lastName ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    birthDate: initial?.birthDate ? initial.birthDate.slice(0, 10) : "",
    birthPlace: initial?.birthPlace ?? "",
    cinNumber: initial?.cinNumber ?? "",
    cinIssuedAt: initial?.cinIssuedAt ? initial.cinIssuedAt.slice(0, 10) : "",
    cinIssuedPlace: initial?.cinIssuedPlace ?? "",
    cinDuplicata: Boolean(initial?.cinDuplicata),
    cinDuplicataAt: initial?.cinDuplicataAt ? initial.cinDuplicataAt.slice(0, 10) : "",
    role: initial?.role ?? "",
    status: initial?.status ?? "ACTIVE",
    departmentId: initial?.departmentId ? String(initial.departmentId) : "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetchDepartments()
      .then(setDepartments)
      .catch(() => setDepartments([]));
  }, []);

  const set = (field: string, value: string | boolean) =>
    setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError("");

    if (!form.lastName || !form.email) {
      setLocalError("Le nom et l'e-mail sont obligatoires (le prénom est facultatif).");
      return;
    }

    if (!isEdit && !form.role) {
      setLocalError("Veuillez choisir un rôle.");
      return;
    }

    if (!isEdit && form.password.length < 8) {
      setLocalError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (form.password && form.password.length < 8) {
      setLocalError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setLocalError("Les mots de passe ne correspondent pas.");
      return;
    }

    const cin = form.cinNumber.replace(/[\s.-]/g, "");

    if (cin && !/^\d{12}$/.test(cin)) {
      setLocalError("Le numéro de CIN doit contenir exactement 12 chiffres.");
      return;
    }

    const payload: UserPayload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      birthDate: form.birthDate,
      birthPlace: form.birthPlace.trim(),
      cinNumber: cin,
      cinIssuedAt: form.cinIssuedAt,
      cinIssuedPlace: form.cinIssuedPlace.trim(),
      cinDuplicata: form.cinDuplicata,
      cinDuplicataAt: form.cinDuplicata ? form.cinDuplicataAt : "",
      status: form.status,
      departmentId: form.departmentId ? Number(form.departmentId) : null,
    };

    // Le rôle du compte ADMIN n'est jamais modifié depuis ce formulaire
    if (!isAdminAccount && form.role) payload.role = form.role;
    if (form.password) payload.password = form.password;

    onSubmit(payload);
  };

  const shownError = localError || error;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      {shownError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {shownError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-gray-700">
          Prénom (facultatif)
          <input className={inputClass} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </label>

        <label className="space-y-1 text-sm font-medium text-gray-700">
          Nom *
          <input className={inputClass} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </label>

        <label className="space-y-1 text-sm font-medium text-gray-700">
          Email *
          <input type="email" className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} />
        </label>

        <label className="space-y-1 text-sm font-medium text-gray-700">
          Téléphone
          <input className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </label>

        <label className="space-y-1 text-sm font-medium text-gray-700">
          Rôle {isEdit ? "" : "*"}
          {isAdminAccount ? (
            <input className={inputClass} value={ROLE_LABELS.ADMIN} disabled />
          ) : (
            <select className={inputClass} value={form.role} onChange={(e) => set("role", e.target.value)}>
              <option value="">Sélectionner un rôle</option>
              {ASSIGNABLE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          )}
        </label>

        <label className="space-y-1 text-sm font-medium text-gray-700">
          Département
          <select className={inputClass} value={form.departmentId} onChange={(e) => set("departmentId", e.target.value)}>
            <option value="">Aucun</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm font-medium text-gray-700">
          Statut
          <select className={inputClass} value={form.status} onChange={(e) => set("status", e.target.value)}>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4 md:col-span-2">
          <p className="text-sm font-semibold text-gray-900">Identité (reprise automatiquement sur les certificats)</p>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-gray-700">
              Date de naissance
              <input
                type="date"
                className={inputClass}
                value={form.birthDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => set("birthDate", e.target.value)}
              />
            </label>

            <label className="space-y-1 text-sm font-medium text-gray-700">
              Lieu de naissance
              <input className={inputClass} placeholder="Ex. Fianarantsoa" value={form.birthPlace} onChange={(e) => set("birthPlace", e.target.value)} />
            </label>

            <label className="space-y-1 text-sm font-medium text-gray-700">
              N° CIN
              <input className={inputClass} inputMode="numeric" maxLength={12} placeholder="12 chiffres" value={form.cinNumber} onChange={(e) => set("cinNumber", e.target.value.replace(/\D/g, "").slice(0, 12))} />
            </label>

            <label className="space-y-1 text-sm font-medium text-gray-700">
              Date de délivrance du CIN
              <input
                type="date"
                className={inputClass}
                value={form.cinIssuedAt}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => set("cinIssuedAt", e.target.value)}
              />
            </label>

            <label className="space-y-1 text-sm font-medium text-gray-700">
              Lieu de délivrance du CIN
              <input className={inputClass} placeholder="Ex. Antananarivo" value={form.cinIssuedPlace} onChange={(e) => set("cinIssuedPlace", e.target.value)} />
            </label>

            <div className="flex flex-wrap items-end gap-4">
              <label className="flex cursor-pointer items-center gap-2 py-3 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={form.cinDuplicata}
                  onChange={(e) => {
                    set("cinDuplicata", e.target.checked);
                    if (!e.target.checked) set("cinDuplicataAt", "");
                  }}
                />
                Le CIN est un duplicata
              </label>

              {form.cinDuplicata && (
                <label className="space-y-1 text-sm font-medium text-gray-700">
                  Date du duplicata
                  <input
                    type="date"
                    className={inputClass}
                    value={form.cinDuplicataAt}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => set("cinDuplicataAt", e.target.value)}
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        <label className="space-y-1 text-sm font-medium text-gray-700">
          {isEdit ? "Nouveau mot de passe (optionnel)" : "Mot de passe *"}
          <input type="password" className={inputClass} value={form.password} onChange={(e) => set("password", e.target.value)} />
        </label>

        <label className="space-y-1 text-sm font-medium text-gray-700">
          Confirmer le mot de passe
          <input type="password" className={inputClass} value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} />
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <Link href="/users" className="rounded-xl border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50">
          Annuler
        </Link>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? "Enregistrement..." : isEdit ? "Enregistrer" : "Créer l'utilisateur"}
        </button>
      </div>
    </form>
  );
}
