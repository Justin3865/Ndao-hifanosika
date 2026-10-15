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

  const set = (field: string, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError("");

    if (!form.firstName || !form.lastName || !form.email) {
      setLocalError("Prénom, nom et email sont obligatoires.");
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

    const payload: UserPayload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
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
          Prénom *
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

        <div />

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
