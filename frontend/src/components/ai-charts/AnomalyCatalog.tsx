"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, CircleCheck, Info } from "lucide-react";
import { State, useInsight } from "@/components/insights/parts";
import { BarChart, ChartCard, Donut, SEVERITY_COLOR } from "./charts";

interface Item { type?: string; severity: "HIGH" | "MEDIUM" | "LOW"; title: string; detail: string; link: string }

interface Case {
  type: string;
  label: string;
  origin: "ANALYSE" | "QUALITE_DONNEES";
  levels: Array<{ severity: "HIGH" | "MEDIUM" | "LOW"; condition: string }>;
  rule: string;
  why: string;
  action: string;
  count: number;
  bySeverity: Record<"HIGH" | "MEDIUM" | "LOW", number>;
  items: Item[];
}

interface Catalog {
  total: number;
  typesWithCases: number;
  typesTotal: number;
  cases: Case[];
  other: Item[];
  perProject: Array<{ project: string; count: number }>;
}

const SEV_LABEL = { HIGH: "Critique", MEDIUM: "Moyenne", LOW: "Faible" } as const;

/**
 * Catalogue de TOUS les cas d'anomalies possibles : graphiques + clic sur un cas pour voir
 * ce qui le rend anormal (règle, seuils, pourquoi, action) et les éléments concernés.
 */
export function AnomalyCatalog() {
  const { data, loading, error } = useInsight<Catalog>("/ai/anomalies/catalog");
  const [open, setOpen] = useState<string | null>(null);
  const [onlyDetected, setOnlyDetected] = useState(false);

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Tous les cas d&apos;anomalies et leurs règles</h2>
        <p className="text-sm text-gray-500">Cliquez sur un cas pour voir ce qui le rend anormal et les éléments concernés dans la base.</p>
      </div>

      <State loading={loading} error={error}>
        {data && (
          <>
            <div className="grid gap-5 lg:grid-cols-2">
              <ChartCard title="Gravité des anomalies détectées" subtitle={`${data.total} anomalie(s) · ${data.typesWithCases}/${data.typesTotal} types observés`}>
                <Donut
                  center={String(data.total)}
                  data={(["HIGH", "MEDIUM", "LOW"] as const).map((s) => ({
                    label: SEV_LABEL[s],
                    value: data.cases.reduce((sum, c) => sum + c.bySeverity[s], 0),
                    color: SEVERITY_COLOR[s],
                  }))}
                />
              </ChartCard>

              <ChartCard title="Nombre de cas par type" subtitle="Histogramme (rouge = critiques, empilé)">
                <BarChart
                  color={SEVERITY_COLOR.MEDIUM}
                  color2={SEVERITY_COLOR.HIGH}
                  data={data.cases.map((c) => ({ label: c.label, value: c.count - c.bySeverity.HIGH, value2: c.bySeverity.HIGH }))}
                  height={260}
                />
              </ChartCard>
            </div>

            {data.perProject.length > 0 && (
              <ChartCard title="Anomalies par projet" subtitle="Les projets les plus concernés">
                <BarChart color={PROJECT_COLOR} data={data.perProject.map((p) => ({ label: p.project, value: p.count }))} />
              </ChartCard>
            )}

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={onlyDetected} onChange={(e) => setOnlyDetected(e.target.checked)} />
              Afficher seulement les cas détectés
            </label>

            <div className="space-y-3">
              {data.cases
                .filter((c) => !onlyDetected || c.count > 0)
                .map((c) => {
                  const isOpen = open === c.type;
                  const worst = c.bySeverity.HIGH ? "HIGH" : c.bySeverity.MEDIUM ? "MEDIUM" : c.bySeverity.LOW ? "LOW" : null;

                  return (
                    <div key={c.type} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                      <button type="button" onClick={() => setOpen(isOpen ? null : c.type)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: worst ? SEVERITY_COLOR[worst] : SEVERITY_COLOR.GOOD }} />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-gray-900">{c.label}</span>
                          <span className="block truncate text-xs text-gray-500">
                            {c.origin === "QUALITE_DONNEES" ? "Qualité des données · " : ""}{c.rule}
                          </span>
                        </span>
                        {c.count > 0 ? (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">{c.count} cas</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"><CircleCheck className="h-3.5 w-3.5" /> Aucun cas</span>
                        )}
                        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition ${isOpen ? "rotate-180" : ""}`} />
                      </button>

                      {isOpen && (
                        <div className="space-y-4 border-t border-gray-100 p-5 text-sm">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl bg-blue-50 p-4 text-blue-900">
                              <p className="mb-1 flex items-center gap-1.5 font-semibold"><Info className="h-4 w-4" /> Ce qui en fait une anomalie</p>
                              <p>{c.why}</p>
                              <p className="mt-2 text-xs opacity-80">Règle : {c.rule}</p>
                            </div>
                            <div className="rounded-xl bg-green-50 p-4 text-green-900">
                              <p className="mb-1 font-semibold">Action recommandée</p>
                              <p>{c.action}</p>
                            </div>
                          </div>

                          <div>
                            <p className="mb-2 font-semibold text-gray-900">Seuils de gravité</p>
                            <ul className="space-y-1.5">
                              {c.levels.map((l) => (
                                <li key={l.severity} className="flex items-center gap-2 text-gray-700">
                                  <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white" style={{ background: SEVERITY_COLOR[l.severity] }}>{SEV_LABEL[l.severity]}</span>
                                  {l.condition}
                                  <span className="text-xs text-gray-400">({c.bySeverity[l.severity]} cas)</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <p className="mb-2 font-semibold text-gray-900">Éléments concernés ({c.items.length})</p>
                            {c.items.length === 0 && <p className="text-gray-500">Aucun élément de la base ne remplit cette règle actuellement.</p>}
                            <div className="space-y-2">
                              {c.items.map((item, i) => (
                                <Link key={i} href={item.link} className="block rounded-xl border border-gray-200 p-3 transition hover:border-blue-300">
                                  <span className="flex items-center justify-between gap-3">
                                    <span className="font-medium text-gray-900">{item.title}</span>
                                    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white" style={{ background: SEVERITY_COLOR[item.severity] }}>{SEV_LABEL[item.severity]}</span>
                                  </span>
                                  <span className="mt-1 block text-gray-600">{item.detail}</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>

            {data.other.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="mb-2 font-semibold text-gray-900">Autres anomalies ({data.other.length})</p>
                {data.other.map((item, i) => <p key={i} className="text-sm text-gray-600">• {item.title} — {item.detail}</p>)}
              </div>
            )}
          </>
        )}
      </State>
    </section>
  );
}

const PROJECT_COLOR = "#3b82f6";
