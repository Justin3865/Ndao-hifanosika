"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout";
import { UserEditorForm } from "@/components/users/UserEditorForm";
import { UserPayload, apiErrorMessage, createUser } from "@/lib/usersApi";

export default function CreateUserPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (payload: UserPayload) => {
    setSubmitting(true);
    setError("");

    try {
      await createUser(payload);
      router.push("/users");
    } catch (err) {
      setError(apiErrorMessage(err, "Impossible de créer l'utilisateur."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Ajouter un utilisateur
          </h1>
          <p className="text-sm text-gray-500">
            Les rôles proposés correspondent à ceux de la base de données.
          </p>
        </div>

        <UserEditorForm
          mode="create"
          submitting={submitting}
          error={error}
          onSubmit={handleSubmit}
        />
      </div>
    </AppLayout>
  );
}
