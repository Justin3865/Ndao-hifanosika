"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { getStoredRole } from "@/lib/access";
import { roleLabel, statusLabel } from "@/lib/roles";
import {
  ApiUser,
  apiErrorMessage,
  formatDateTime,
  fetchUser,
  fullName,
  initialsOf,
} from "@/lib/usersApi";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-gray-100 py-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900">{value}</span>
    </div>
  );
}

export default function UserDetailsPage() {
  const params = useParams<{ id: string }>();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(getStoredRole() === "ADMIN");

    fetchUser(params.id)
      .then(setUser)
      .catch((err) =>
        setError(apiErrorMessage(err, "Utilisateur introuvable."))
      )
      .finally(() => setLoading(false));
  }, [params.id]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/users" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Link>

          {isAdmin && user && (
            <Link
              href={`/users/${user.id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Pencil className="h-4 w-4" /> Modifier
            </Link>
          )}
        </div>

        {loading && <p className="text-gray-500">Chargement...</p>}
        {!loading && !user && <p className="text-red-600">{error}</p>}

        {user && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-lg font-semibold text-purple-700">
                {initialsOf(user)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{fullName(user)}</h1>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>

            <Row label="Rôle" value={roleLabel(user.role)} />
            <Row label="Statut" value={statusLabel(user.status)} />
            <Row label="Département" value={user.department?.name ?? "—"} />
            <Row label="Téléphone" value={user.phone || "—"} />
            <Row label="Créé le" value={formatDateTime(user.createdAt)} />
            <Row label="Dernière connexion" value={formatDateTime(user.lastLoginAt)} />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
