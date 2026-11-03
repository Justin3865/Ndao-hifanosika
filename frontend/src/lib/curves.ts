// src/lib/curves.ts
// Courbes d'interpolation Lagrange / Hermite (API /integration/curves) + simulation d'impact.

import api from "@/lib/axios";

export type CurveMethod = "lagrange" | "hermite";
export type CurveKind = "projects" | "interns";

export interface CurveNode {
  x: number;
  y: number;
  label?: string;
}

export interface CurveResult {
  method: CurveMethod;
  samples: Array<{ x: number; y: number }>;
  optimum: { max: { x: number; y: number }; min: { x: number; y: number } };
  loo: { rmse: number | null; mae: number | null; tested: number };
  clamped: boolean;
  forecast: { x: number; y: number } | null;
}

export interface CurvePayload {
  kind: CurveKind;
  mode: "cohort" | "single";
  title: string;
  xLabel: string;
  yLabel: string;
  unit: "/20" | "%";
  n: number;
  domain: [number, number];
  bounds: [number, number];
  nodes: CurveNode[];
  curves: CurveResult[];
  best: CurveMethod;
  warnings: string[];
  labels: Array<{ x: number; label: string }>;
  reference?: { name: string; points: Array<{ x: number; y: number }> };
  choices: Array<{ id: number; label: string; points: number }>;
  generatedAt: string;
}

export interface CurveQuery {
  id?: number;
  level?: "L3" | "M2";
  method?: "lagrange" | "hermite" | "both";
}

export const fetchCurve = async (kind: CurveKind, query: CurveQuery = {}): Promise<CurvePayload> => {
  const res = await api.get(`/integration/curves/${kind}`, { params: { ...query } });
  return res.data?.data as CurvePayload;
};

export interface RemovalImpact {
  personKey: string;
  name: string;
  projects: Array<{
    projectId: number;
    name: string;
    internsBefore: number;
    internsAfter: number;
    internAvgBefore: number | null;
    internAvgAfter: number | null;
    finalBefore: number | null;
    finalAfter: number | null;
    deltaFinal: number | null;
    integratedBefore: number | null;
    integratedAfter: number | null;
    deltaIntegrated: number | null;
  }>;
}

export const fetchRemovalImpact = async (internshipId: number): Promise<RemovalImpact | null> =>
  ((await api.get(`/integration/impact/${internshipId}`)).data?.data ?? null) as RemovalImpact | null;
