"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight } from "lucide-react";
import api from "@/lib/axios";
import { errorMessage } from "@/lib/crud";
import { BarList, ChartCard, DonutChart, SEVERITY_COLORS } from "./charts";
import { ENGINE_LABELS } from "./AiDashboard";

interface Example {
  title: string;
  detail: string;
  link: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  departmentName: string | null;
}

interface AnomalyCase {
  code: string;
  scope: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  label: string;
  description: string;
  rule: string;
  notifiedTo: string;
  count: number;
  examples: Example[];
}

interface CasesData {
  engine: string;
  total: number;
  typesDetected: number;
  typesTotal: number;
  bySeverity: Array<{ key: string; label: string; value: number }>;
  byScope: Array<{ key: string; label: string; value: number }>;
  scopes: string[];
  cases: AnomalyCase[];
}

const SEVERITY_LABEL = { HIGH: "Critique", MEDIUM: "Moyenne", LOW: "Faible" } as const;
const SEVERITY_PILL = {
  HIGH: "bg-red-100 text-red-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW: "bg-blue-100 text-blue-700",
} as const;

type View = "all" | "detected" | "none";

/**
 * Tous les cas d'anomalie possibles : pour chacun, la règle qui en fait une anomalie,
 * le nombre de cas détectés actuellement et des exemples cliquables.
 */
export function AnomalyCases() {
  const [data, setData] = useState<CasesData | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<View>("all");
  const [scope, setScope] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .get("/ai/anomalies/cases", { timeout: 90_000 })
      .then((res) => setData(res.data?.data ?? null))
      .catch((err) => setError(errorMessage(err, "Impossible de charger les cas d'anomalies.")));
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];

    return data.cases
      .filter((item) => (view === "all" ? true : view === "detected" ? item.count > 0 : item.count === 0))
      .filter((item) => !scope || item.scope === scope)
      .sort((a, b) => (b.count > 0 ? 1 : 0) - (a.count > 0 ? 1 : 0) || b.count - a.count);
  }, [data, view, scope]);

  const toggle = (code: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  if (!data) return <p className="text-sm text-gray-500">Analyse des cas d&apos;anomalies…</p>;

  const engine = ENGINE_LABELS[data.engine];
  const tab = (value: View, label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => setView(value)}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
        view === value ? "bg-blue-800 text-white" : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Tous les cas d&apos;anomalies possibles</h2>
          <p className="text-xs text-gray-500">
            {data.typesDetected} type(s) détecté(s) sur {data.typesTotal} · {data.total} cas au total. Chaque cas indique la règle qui en fait une anomalie.
          </p>
        </div>
        {engine && <span className={`rounded-full px-3 py-1 text-xs font-medium ${engine.tone}`}>{engine.text}</span>}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Cas détectés par gravité" subtitle="Diagramme circulaire" empty={data.total === 0 && "Aucun cas détecté."}>
          <DonutChart
            centerValue={data.total}
            centerLabel="cas"
            slices={data.bySeverity.map((s) => ({ label: s.label, value: s.value, color: SEVERITY_COLORS[s.key] }))}
          />
        </ChartCard>

        <ChartCard title="Cas détectés par catégorie" subtitle="Histogramme par domaine" empty={data.byScope.length === 0 && "Aucun cas détecté."}>
          <BarList items={data.byScope.map((s) => ({ label: s.label, value: s.value }))} />
        </ChartCard>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tab("all", `Tous les cas (${data.cases.length})`)}
        {tab("detected", `Détectés (${data.typesDetected})`)}
        {tab("none", `Aucun cas (${data.typesTotal - data.typesDetected})`)}

        <select
          value={scope}
          onChange={(event) => setScope(event.target.value)}
          className="rounded-full bg-white px-4 py-1.5 text-sm text-gray-700 ring-1 ring-gray-200"
        >
          <option value="">Toutes les catégories</option>
          {data.scopes.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>

      <ul className="space-y-3">
        {rows.map((item) => {
          const expanded = open.has(item.code);

          return (
            <li key={item.code} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex">
                <span className="w-1.5 shrink-0" style={{ backgroundColor: item.count > 0 ? SEVERITY_COLORS[item.severity] : "#d1d5db" }} />

                <div className="min-w-0 flex-1 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{item.label}</h3>
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-gray-600">{item.scope}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${SEVERITY_PILL[item.severity]}`}>{SEVERITY_LABEL[item.severity]}</span>

                    {item.count > 0 ? (
                      <span className="ml-auto rounded-full bg-red-500 px-3 py-0.5 text-xs font-bold text-white">{item.count} cas</span>
                    ) : (
                      <span className="ml-auto flex items-center gap-1 rounded-full bg-green-100 px-3 py-0.5 text-xs font-medium text-green-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Aucun cas
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">Pourquoi c&apos;est une anomalie : </span>
                    {item.rule}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{item.description}</p>
                  <p className="mt-1 text-xs text-gray-400">Notifie : {item.notifiedTo}</p>

                  {item.count > 0 && (
                    <button
                      type="button"
                      onClick={() => toggle(item.code)}
                      className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
                    >
                      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      {expanded ? "Masquer" : `Voir ${Math.min(item.count, item.examples.length)} exemple(s)`}
                    </button>
                  )}

                  {expanded && (
                    <ul className="mt-2 space-y-2">
                      {item.examples.map((example, index) => (
                        <li key={`${example.title}-${index}`}>
                          <Link
                            href={example.link}
                            className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2 transition hover:border-blue-300"
                          >
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-gray-900">{example.title}</span>
                              <span className="block text-xs text-gray-600">{example.detail}</span>
                              {example.departmentName && <span className="text-[11px] text-indigo-600">{example.departmentName}</span>}
                            </span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${SEVERITY_PILL[example.severity]}`}>
                              {SEVERITY_LABEL[example.severity]}
                            </span>
                          </Link>
                        </li>
                      ))}
                      {item.count > item.examples.length && (
                        <li className="text-xs text-gray-500">… et {item.count - item.examples.length} autre(s) cas dans la liste ci-dessous.</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            </li>
          );
        })}

        {rows.length === 0 && <li className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">Aucun cas pour ce filtre.</li>}
      </ul>
    </section>
  );
}
