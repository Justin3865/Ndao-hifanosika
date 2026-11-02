"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download, Eye, FileText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout";
import { getStoredRole } from "@/lib/access";
import {
  Item,
  ResourceConfig,
  canSeeBudget,
  errorMessage,
  exportCsv,
  isBudgetField,
  isBudgetLabel,
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

    const matching = items.filter((item) => {
      const matchesSearch =
        !query || config.searchOf(item).toLowerCase().includes(query);

      const matchesStatus =
        !status ||
        !config.statusFilter ||
        item[config.statusFilter.field] === status;

      return matchesSearch && matchesStatus;
    });

    // Une seule ligne par clé (ex. par matricule) : les doublons sont masqués, leur nombre est conservé
    if (!config.uniqueBy) return matching;

    const kept = new Map<string, (typeof matching)[number]>();

    for (const item of matching) {
      const key = config.uniqueBy(item);
      const first = kept.get(key);

      if (first) first._hiddenCount = (first._hiddenCount ?? 0) + 1;
      else kept.set(key, { ...item, _hiddenCount: 0 });
    }

    return Array.from(kept.values());
  }, [items, search, status, config]);

  // Pages : avec un regroupement, un groupe (une même personne / un même matricule) n'est jamais coupé entre deux pages
  const pages = useMemo(() => {
    if (!config.groupBy) return null;

    const result: typeof filtered[] = [];
    let currentPage: typeof filtered = [];
    let i = 0;

    while (i < filtered.length) {
      const key = config.groupBy(filtered[i]);
      let end = i + 1;

      while (end < filtered.length && config.groupBy(filtered[end]) === key) end++;

      const block = filtered.slice(i, end);

      if (currentPage.length > 0 && currentPage.length + block.length > PAGE_SIZE) {
        result.push(currentPage);
        currentPage = [];
      }

      currentPage = currentPage.concat(block);
      i = end;
    }

    if (currentPage.length > 0) result.push(currentPage);

    return result;
  }, [filtered, config]);

  const totalPages = pages ? Math.max(1, pages.length) : Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visible = pages ? (pages[current - 1] ?? []) : filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  // Regroupement : lignes consécutives de même clé (colonnes `group` fusionnées une fois par groupe)
  const groupKeys = config.groupBy ? visible.map((item) => config.groupBy!(item)) : [];
  const groupInfo = visible.map((_, idx) => {
    if (!config.groupBy) return { first: true, size: 1, items: [visible[idx]] };

    const first = idx === 0 || groupKeys[idx] !== groupKeys[idx - 1];
    let size = 1;

    while (idx + size < visible.length && groupKeys[idx + size] === groupKeys[idx]) size++;

    return { first, size, items: first ? visible.slice(idx, idx + size) : [] };
  });

  const showBudget = canSeeBudget(role);
  const columns = config.columns.filter((column) => showBudget || !isBudgetLabel(column.header));
  const exportFields = config.fields.filter((field) => showBudget || !isBudgetField(field.name));
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
              {config.subtitle ?? `${filtered.length} élément(s)`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
          {/* Offres de stage : accès réservé à l'équipe de gestion (ADMIN, RH, COORDINATOR) */}
          {config.basePath === "/internships" && ["ADMIN", "RH", "COORDINATOR"].includes(role) && (
            <>
              <Link
                href="/stages"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-600 bg-white px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
              >
                <FileText className="h-4 w-4" />
                Offres de stage
              </Link>
              <Link
                href="/stages?nouvelle=1"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Nouvelle offre
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() =>
              exportCsv(`${config.basePath.replace("/", "")}.csv`, exportFields, filtered)
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

        {!loading && !error && config.listExtra?.(filtered)}

        {loading && <p className="text-sm text-gray-500">Chargement...</p>}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className={`overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm`}>
            <table className={`w-full ${config.centerCells ? "text-center" : "text-left"} text-sm ${config.fitWidth ? "" : "min-w-[720px]"}`}>
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  {columns.map((column) => (
                    <th key={column.header} className={`${config.fitWidth ? "px-1.5 text-[10px]" : "px-4"} py-3 ${config.centerCells ? "text-center align-middle" : ""} font-semibold`}>
                      {column.header}
                    </th>
                  ))}
                  <th className={`${config.fitWidth ? "px-1.5 text-[10px]" : "px-4"} py-3 ${config.centerCells ? "text-center" : "text-right"} font-semibold`}>Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {visible.length === 0 && (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="px-4 py-10 text-center text-gray-500"
                    >
                      Aucun élément trouvé.
                    </td>
                  </tr>
                )}

                {visible.map((item, idx) => (
                  <tr key={item.id} className={`hover:bg-gray-50 ${config.groupBy && groupInfo[idx].first && idx > 0 ? "border-t-2 border-gray-200" : ""}`}>
                    {columns.map((column) => {
                      if (config.groupBy && column.group) {
                        if (!groupInfo[idx].first) return null;

                        return (
                          <td
                            key={column.header}
                            rowSpan={groupInfo[idx].size}
                            className={`${config.fitWidth ? "px-1.5 text-xs" : "px-4"} py-3 ${config.centerCells ? "text-center" : ""} align-middle text-gray-700`}
                          >
                            {column.render(item, groupInfo[idx].items)}
                          </td>
                        );
                      }

                      return (
                        <td key={column.header} className={`${config.fitWidth ? "px-1.5 text-xs" : "px-4"} py-3 ${config.centerCells ? "text-center" : ""} align-middle text-gray-700`}>
                          {column.render(item)}
                        </td>
                      );
                    })}

                    <td className={`${config.fitWidth ? "px-1.5" : "px-4"} py-3`}>
                      <div className={`flex ${config.centerCells ? "justify-center" : "justify-end"} gap-1 ${config.fitWidth ? "[&>a]:!p-1.5 [&>button]:!p-1.5" : ""}`}>
                        {config.rowActions?.(item, role)}

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
