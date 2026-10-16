"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { getStoredRole } from "@/lib/access";
import {
  Item,
  ResourceConfig,
  errorMessage,
  getItem,
  removeItem,
} from "@/lib/crud";

export function ResourceDetailPage({
  config,
  id,
}: {
  config: ResourceConfig;
  id: string;
}) {
  const router = useRouter();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    setRole(getStoredRole());

    getItem(config, id)
      .then(setItem)
      .catch((err) => setError(errorMessage(err, "Élément introuvable.")))
      .finally(() => setLoading(false));
  }, [config, id]);

  const canEdit = config.editRoles.includes(role);
  const canDelete = config.deleteRoles.includes(role);
  const deleteLabel =
    config.deleteMode === "deactivate" ? "Désactiver" : "Supprimer";

  const handleDelete = async () => {
    if (!item || !window.confirm(`${deleteLabel} « ${config.titleOf(item)} » ?`))
      return;

    try {
      await removeItem(config, id);
      router.push(config.basePath);
    } catch (err) {
      window.alert(errorMessage(err, "Action impossible."));
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={config.basePath}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" /> Retour
          </Link>

          {item && (
            <div className="flex gap-2">
              {canEdit && (
                <Link
                  href={`${config.basePath}/${id}/edit`}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Pencil className="h-4 w-4" /> Modifier
                </Link>
              )}

              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" /> {deleteLabel}
                </button>
              )}
            </div>
          )}
        </div>

        {loading && <p className="text-gray-500">Chargement...</p>}
        {!loading && !item && <p className="text-red-600">{error}</p>}

        {item && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h1 className="mb-4 text-xl font-bold text-gray-900">
              {config.titleOf(item)}
            </h1>

            {config.detail(item).map((row) => (
              <div
                key={row.label}
                className="flex justify-between gap-6 border-b border-gray-100 py-3 text-sm"
              >
                <span className="text-gray-500">{row.label}</span>
                <span className="text-right font-medium text-gray-900">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
