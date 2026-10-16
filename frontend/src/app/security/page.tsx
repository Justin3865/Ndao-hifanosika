"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldAlert, ShieldCheck, Users } from "lucide-react";
import api from "@/lib/axios";
import { AppLayout } from "@/components/layout";
import { errorMessage, fmtDateTime } from "@/lib/crud";
import { roleLabel } from "@/lib/roles";

interface AuditRow {
  id: number;
  action: string;
  details?: { statusCode?: number } | null;
  ipAddress?: string | null;
  createdAt: string;
  user: { id: number; firstName: string; lastName: string; role: string } | null;
}

const code = (row: AuditRow) => Number(row.details?.statusCode ?? 0);

export default function SecurityPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [onlyErrors, setOnlyErrors] = useState(false);

  useEffect(() => {
    api
      .get("/audit?limit=300")
      .then((res) => setRows(res.data?.data ?? []))
      .catch((err) => setError(errorMessage(err, "Journal indisponible.")))
      .finally(() => setLoading(false));
  }, []);

  const failedLogins = rows.filter((r) => r.action.includes("/api/auth/login") && [401, 403].includes(code(r))).length;
  const day = Date.now() - 24 * 3600 * 1000;
  const last24 = rows.filter((r) => new Date(r.createdAt).getTime() > day).length;
  const actors = new Set(rows.map((r) => r.user?.id).filter(Boolean)).size;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const text = `${r.action} ${r.user?.firstName ?? ""} ${r.user?.lastName ?? ""} ${r.ipAddress ?? ""}`.toLowerCase();
      return (!q || text.includes(q)) && (!onlyErrors || code(r) >= 400);
    });
  }, [rows, search, onlyErrors]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Journal d&apos;audit</h1>
          <p className="text-sm text-gray-500">Actions de modification enregistrées par la plateforme (300 dernières).</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Actions (24 h)", value: last24, icon: ShieldCheck, tone: "bg-blue-100 text-blue-700" },
            { label: "Connexions échouées", value: failedLogins, icon: ShieldAlert, tone: "bg-red-100 text-red-700" },
            { label: "Utilisateurs actifs", value: actors, icon: Users, tone: "bg-green-100 text-green-700" },
          ].map((card) => (
            <div key={card.label} className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className={`rounded-xl p-3 ${card.tone}`}><card.icon className="h-5 w-5" /></div>
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher (action, utilisateur, IP)..."
            className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-600"
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} className="h-4 w-4" />
            Erreurs uniquement
          </label>
        </div>

        {loading && <p className="text-gray-500">Chargement...</p>}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                {["Date", "Utilisateur", "Action", "Code", "IP"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">{fmtDateTime(row.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    {row.user ? (
                      <>
                        <span className="font-medium text-gray-900">{row.user.firstName} {row.user.lastName}</span>
                        <span className="ml-2 text-xs text-gray-400">{roleLabel(row.user.role)}</span>
                      </>
                    ) : <span className="text-gray-400">Anonyme</span>}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{row.action}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${code(row) >= 400 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                      {code(row) || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{row.ipAddress ?? "—"}</td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">Aucune entrée.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
