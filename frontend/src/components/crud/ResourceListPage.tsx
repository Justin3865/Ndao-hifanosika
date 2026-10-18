"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { getStoredRole } from "@/lib/access";
import {
  Item,
  ResourceConfig,
  errorMessage,
  exportCsv,
  listItems,
  removeItem,
} from "@/lib/crud";
import { confirmDialog, toast } from "@/lib/toast";

const PAGE_SIZE = 10;

export function ResourceListPage({ config }: { config: ResourceConfig }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setRole(getStoredRole());

    listItems(config)
      .then(setItems)
      .catch((err) =>
        setError(errorMessage(err, "Impossible de charger les données."))
      )
      .finally(() => setLoading(false));
  }, [config]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !query || config.searchOf(item).toLowerCase().includes(query);

      const matchesStatus =
        !status ||
        !config.statusFilter ||
        item[config.statusFilter.field] === status;

      return matchesSearch && matchesStatus;
    });
  }, [items, search, status, config]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const canCreate = config.createRoles.includes(role);
  const canEdit = config.editRoles.includes(role);
  const canDelete = config.deleteRoles.includes(role);
  const createHref = config.createHref ?? `${config.basePath}/create`;
  const deleteLabel =
    config.deleteLabel ?? (config.deleteMode === "deactivate" ? "Désactiver" : "Supprimer");

  const handleDelete = async (item: Item) => {
    const confirmed = await confirmDialog(
      `${deleteLabel} « ${config.titleOf(item)} » ?`
    );

    if (!confirmed) return;

    try {
      await removeItem(config, item.id);
      toast.success(config.deleteMode === "deactivate" ? "Désactivation effectuée." : "Suppression effectuée.");

      if (config.deleteMode === "deactivate") {
        const refreshed = await listItems(config);
        setItems(refreshed);
      } else {
        setItems((current) => current.filter((row) => row.id !== item.id));
      }
    } catch (err) {
      toast.error(errorMessage(err, "Action impossible."));
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
            <p className="text-sm text-gray-500">
              {config.subtitle ?? `${items.length} élément(s)`}
            </p>
          </div>

          <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              exportCsv(`${config.basePath.replace("/", "")}.csv`, config.fields, filtered)
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Exporter CSV
          </button>

          {canCreate && (
            <Link
              href={createHref}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              Ajouter
            </Link>
          )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Rechercher..."
              className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {config.statusFilter && (
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="">Tous les statuts</option>
              {config.statusFilter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {loading && <p className="text-sm text-gray-500">Chargement...</p>}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  {config.columns.map((column) => (
                    <th key={column.header} className="px-4 py-3 font-semibold">
                      {column.header}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {visible.length === 0 && (
                  <tr>
                    <td
                      colSpan={config.columns.length + 1}
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      Aucun élément trouvé.
                    </td>
                  </tr>
                )}

                {visible.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    {config.columns.map((column) => (
                      <td key={column.header} className="px-4 py-3 text-gray-700">
                        {column.render(item)}
                      </td>
                    ))}

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`${config.basePath}/${item.id}`}
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                          title="Voir"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>

                        {canEdit && (
                          <Link
                            href={`${config.basePath}/${item.id}/edit`}
                            className="rounded-lg p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                            title="Modifier"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        )}

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                            title={deleteLabel}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Page {current} / {totalPages} — {filtered.length} résultat(s)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={current === 1}
                onClick={() => setPage(current - 1)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40"
              >
                Précédent
              </button>
              <button
                type="button"
                disabled={current === totalPages}
                onClick={() => setPage(current + 1)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
