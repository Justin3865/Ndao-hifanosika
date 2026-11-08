"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, ClipboardCheck, GraduationCap, HeartHandshake, Target, Wallet } from "lucide-react";
import api from "@/lib/axios";

/* ---------- Types (miroir de GET /api/dashboard/department) ---------- */

interface BudgetRow {
  id: number;
  name: string;
  code: string | null;
  budget: number;
  spent: number;
  rate: number | null;
  overBudget: boolean;
}

interface RhData {
  internships: { total: number; inProgress: number; byStatus: Record<string, number> };
  objectives: { total: number; overdue: number; averageProgress: number | null; byStatus: Record<string, number> };
  evaluations: {
    byStatus: Record<string, number>;
    averageScore: number | null;
    campaignsActive: number;
    campaignsLate: number;
    lateCampaigns: Array<{ id: number; name: string; endDate: string | null }>;
  };
}

interface DafData {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  rate: number | null;
  projectsCount: number;
  withoutBudget: number;
  overBudget: number;
  projects: BudgetRow[];
}

interface ImpactData {
  beneficiaries: {
    total: number;
    minors: number;
    vulnerable: number;
    byGender: Record<string, number>;
    byProject: Array<{ projectId: number; name: string; count: number }>;
  };
  journey: { ACTIVE: number; COMPLETED: number; DROPPED_OUT: number; rate: number | null; completionRate: number | null };
  attendance: { sessions: number; present: number; rate: number | null };
  postProgram: { completed: number; insertionRate: number | null; satisfaction: number | null };
}

interface DepartmentData {
  role: string;
  sections: Array<"RH" | "DAF" | "IMPACT">;
  scoped: boolean;
  generatedAt: string;
  rh?: RhData;
  daf?: DafData;
  impact?: ImpactData;
}

/* ---------- Utilitaires d'affichage ---------- */

const GENDER_LABEL: Record<string, string> = { FEMALE: "Femmes", MALE: "Hommes", OTHER: "Autre", UNKNOWN: "Non précisé" };
const EVAL_LABEL: Record<string, string> = { DRAFT: "Brouillon", SUBMITTED: "Soumises", VALIDATED: "Validées" };

const nf = new Intl.NumberFormat("fr-FR");
const money = (n: number) => `${nf.format(Math.round(n))} Ar`;
const percent = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n} %`);

function titleFor(role: string): { title: string; hint: string } {
  switch (role) {
    case "RH":
      return { title: "Tableau de bord RH", hint: "Équipes, stagiaires et évaluations" };
    case "DAF":
      return { title: "Tableau de bord financier", hint: "Budget indicatif par projet — le DAF conserve ses outils comptables" };
    case "COMMUNICATION":
      return { title: "Impact & communication", hint: "Statistiques agrégées et anonymisées" };
    case "COORDINATOR":
      return { title: "Impact de mes projets", hint: "Bénéficiaires, parcours et suivi de vos projets" };
    default:
      return { title: "Vue consolidée par département", hint: "RH, finances et impact" };
  }
}

function Card({ icon: Icon, title, tone, children }: { icon: typeof Target; title: string; tone: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className={`rounded-lg p-2 text-white ${tone}`}>
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: React.ReactNode; warn?: boolean }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className={`text-2xl font-bold ${warn ? "text-red-600" : "text-gray-900"}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function Bar({ label, value, max, right, danger }: { label: string; value: number; max: number; right?: string; danger?: boolean }) {
  const width = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-sm">
        <span className="truncate font-medium text-gray-800">{label}</span>
        <span className={`shrink-0 ${danger ? "font-semibold text-red-600" : "text-gray-500"}`}>{right ?? value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${danger ? "bg-red-500" : "bg-gradient-to-r from-blue-600 to-amber-400"}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

/* ---------- Sections ---------- */

function RhSection({ data }: { data: RhData }) {
  const evalTotal = Object.values(data.evaluations.byStatus).reduce((s, n) => s + n, 0);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card icon={GraduationCap} title="Stagiaires" tone="bg-amber-500">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Stages en cours" value={data.internships.inProgress} />
          <Stat label="Stages au total" value={data.internships.total} />
        </div>
        <Link href="/internships" className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline">Voir les stages</Link>
      </Card>

      <Card icon={Target} title="Objectifs des membres" tone="bg-emerald-600">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Objectifs" value={data.objectives.total} />
          <Stat label="En retard" value={data.objectives.overdue} warn={data.objectives.overdue > 0} />
          <Stat label="Progression moy." value={percent(data.objectives.averageProgress)} />
        </div>
        <Link href="/objectifs" className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline">Suivre les objectifs</Link>
      </Card>

      <Card icon={ClipboardCheck} title="Évaluations du personnel" tone="bg-blue-600">
        <div className="space-y-2">
          {Object.keys(EVAL_LABEL).map((k) => (
            <Bar key={k} label={EVAL_LABEL[k]} value={data.evaluations.byStatus[k] ?? 0} max={evalTotal} />
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Note moyenne : <b>{data.evaluations.averageScore ?? "—"}</b> · Campagnes actives : <b>{data.evaluations.campaignsActive}</b>
        </p>
        {data.evaluations.campaignsLate > 0 && (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
            <p className="flex items-center gap-1 font-semibold">
              <AlertTriangle className="h-3.5 w-3.5" /> {data.evaluations.campaignsLate} campagne(s) en retard
            </p>
            <ul className="mt-1 list-inside list-disc">
              {data.evaluations.lateCampaigns.map((c) => (
                <li key={c.id}>{c.name}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}

function DafSection({ data }: { data: DafData }) {
  return (
    <Card icon={Wallet} title="Budget indicatif par projet" tone="bg-violet-600">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Budget total" value={money(data.totalBudget)} />
        <Stat label="Dépensé" value={money(data.totalSpent)} />
        <Stat label="Consommation" value={percent(data.rate)} />
        <Stat label="Projets en dépassement" value={data.overBudget} warn={data.overBudget > 0} />
      </div>
      {data.withoutBudget > 0 && <p className="mt-2 text-xs text-gray-500">{data.withoutBudget} projet(s) sans budget renseigné.</p>}
      <div className="mt-4 space-y-3">
        {data.projects.map((p) => (
          <Bar
            key={p.id}
            label={p.code ? `${p.code} · ${p.name}` : p.name}
            value={p.rate ?? 0}
            max={100}
            right={p.budget > 0 ? `${money(p.spent)} / ${money(p.budget)} (${percent(p.rate)})` : "budget non renseigné"}
            danger={p.overBudget}
          />
        ))}
      </div>
      <Link href="/projects" className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline">Voir les projets</Link>
    </Card>
  );
}

function ImpactSection({ data }: { data: ImpactData }) {
  const b = data.beneficiaries;
  const maxProject = Math.max(1, ...b.byProject.map((p) => p.count));
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card icon={HeartHandshake} title="Bénéficiaires" tone="bg-rose-600">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Total" value={nf.format(b.total)} />
          <Stat label="Mineurs" value={nf.format(b.minors)} />
          <Stat label="Vulnérables" value={nf.format(b.vulnerable)} />
        </div>
        <div className="mt-3 space-y-2">
          {Object.entries(b.byGender).map(([g, n]) => (
            <Bar key={g} label={GENDER_LABEL[g] ?? g} value={n} max={b.total} right={`${n} (${percent(b.total ? Math.round((n / b.total) * 100) : null)})`} />
          ))}
        </div>
      </Card>

      <Card icon={Target} title="Parcours et présence" tone="bg-blue-600">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="En cours" value={data.journey.ACTIVE} />
          <Stat label="Terminés" value={data.journey.COMPLETED} />
          <Stat label="Abandons" value={data.journey.DROPPED_OUT} warn={data.journey.DROPPED_OUT > 0} />
        </div>
        <p className="mt-3 text-sm text-gray-600">
          Taux de complétion : <b>{percent(data.journey.completionRate)}</b>
          <br />
          Taux de présence : <b>{percent(data.attendance.rate)}</b> <span className="text-xs text-gray-400">({data.attendance.sessions} pointages)</span>
        </p>
      </Card>

      <Card icon={ClipboardCheck} title="Impact après programme" tone="bg-emerald-600">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Relances faites" value={data.postProgram.completed} />
          <Stat label="Insertion" value={percent(data.postProgram.insertionRate)} />
          <Stat label="Satisfaction /5" value={data.postProgram.satisfaction ?? "—"} />
        </div>
        {b.byProject.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase text-gray-400">Bénéficiaires par projet</p>
            {b.byProject.map((p) => (
              <Bar key={p.projectId} label={p.name} value={p.count} max={maxProject} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------- Composant ---------- */

export function DepartmentDashboard({ role }: { role: string }) {
  const [data, setData] = useState<DepartmentData | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get("/dashboard/department")
      .then((r) => alive && setData(r.data?.data ?? null))
      .catch(() => alive && setData(null)); // en cas d'erreur : on garde le tableau de bord générique
    return () => {
      alive = false;
    };
  }, [role]);

  if (!data || data.sections.length === 0) return null;
  const { title, hint } = titleFor(data.role);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">
          {hint}
          {data.scoped ? " · limité à vos projets" : ""}
        </p>
      </div>
      {data.rh && <RhSection data={data.rh} />}
      {data.daf && <DafSection data={data.daf} />}
      {data.impact && <ImpactSection data={data.impact} />}
    </section>
  );
}
