"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout";
import { UserEditorForm } from "@/components/users/UserEditorForm";
import {
  ApiUser,
  UserPayload,
  apiErrorMessage,
  fetchUser,
  updateUser,
} from "@/lib/usersApi";

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUser(id)
      .then(setUser)
      .catch((err) =>
        setError(apiErrorMessage(err, "Utilisateur introuvable."))
      )
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (payload: UserPayload) => {
    setSubmitting(true);
    setError("");

    try {
      await updateUser(id, payload);
      router.push(`/users/${id}`);
    } catch (err) {
      setError(apiErrorMessage(err, "Impossible de modifier l'utilisateur."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Modifier l&apos;utilisateur
        </h1>

        {loading && <p className="text-gray-500">Chargement...</p>}

        {!loading && !user && (
          <p className="text-red-600">{error || "Utilisateur introuvable."}</p>
        )}

        {user && (
          <UserEditorForm
            mode="edit"
            initial={user}
            submitting={submitting}
            error={error}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </AppLayout>
  );
}
