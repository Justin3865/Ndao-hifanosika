"use client";

import Link from "next/link";
import { CheckCircle2, Clock, Flag, MapPin, Target, Users, Wallet } from "lucide-react";
import {
  ACTIVITY_STATUS_LABEL,
  activityActual,
  activityDisplayStatus,
  activityPlanned,
  fmtDate,
  fmtMoney,
  fmtPct,
  indicatorProgress,
  isMilestoneOverdue,
  milestoneActual,
  milestoneDelayDays,
  resultProgress,
  toNum,
  type ActivityDisplayStatus,
  type ObjectiveNode,
  type ProjectMonitoring,
} from "@/lib/monitoring";
import { EmptyState, Kpi, Pill, SeProgress, Section } from "./parts";

const actTone: Record<ActivityDisplayStatus, string> = {
  PLANNED: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  LATE: "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-200 text-slate-500",
};

// ------------------------------------------------------------
// OBJECTIFS → RÉSULTATS → INDICATEURS
// ------------------------------------------------------------

export function ObjectivesTab({ tree }: { tree: ObjectiveNode[] | null }) {
  if (tree === null)
    return (
      <EmptyState>
        L&apos;API des objectifs / résultats / indicateurs n&apos;est pas encore exposée par le backend
        (<code>/monitoring/projects/:id/objectives</code>). Les modèles Prisma existent déjà ;
        dès que l&apos;endpoint est ajouté, cette arborescence se remplit automatiquement.
      </EmptyState>
    );
  if (tree.length === 0)
    return <EmptyState>Aucun objectif défini pour ce projet. Ajoutez des objectifs, résultats attendus et indicateurs avec baseline et cible.</EmptyState>;

  return (
    <div className="space-y-4">
      {tree.map((o) => (
        <div key={o.id} className="rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 rounded-t-xl bg-slate-50 px-4 py-3">
            <Target className="h-4 w-4 text-blue-600" />
            <h3 className="font-bold text-slate-900">{o.title}</h3>
          </div>
          <div className="space-y-3 p-4">
            {o.results.length === 0 && <p className="text-sm text-slate-500">Aucun résultat attendu.</p>}
            {o.results.map((r) => (
              <div key={r.id} className="rounded-lg border border-slate-100 p-3">
                <SeProgress value={resultProgress(r)} label={`Résultat : ${r.title}`} />
                {r.indicators.length > 0 && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-xs">
                      <thead className="text-slate-500">
                        <tr>
                          <th className="py-1 pr-2">Indicateur</th>
                          <th className="px-2">Baseline</th>
                          <th className="px-2">Cible</th>
                          <th className="px-2">Réalisé</th>
                          <th className="w-40 pl-2">Avancement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.indicators.map((i) => (
                          <tr key={i.id} className="border-t border-slate-100">
                            <td className="py-2 pr-2 font-medium text-slate-800">{i.name}{i.unit && <span className="text-slate-400"> ({i.unit})</span>}</td>
                            <td className="px-2">{toNum(i.baseline) ?? "—"}</td>
                            <td className="px-2">{toNum(i.target) ?? "—"}</td>
                            <td className="px-2 font-semibold">{toNum(i.currentValue) ?? "—"}</td>
                            <td className="pl-2"><SeProgress value={indicatorProgress(i)} size="sm" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// ACTIVITÉS
// ------------------------------------------------------------

export function ActivitiesTab({ m }: { m: ProjectMonitoring }) {
  const acts = m.project.activities ?? [];
  if (!acts.length) return <EmptyState>Aucune activité pour ce projet.</EmptyState>;

  return (
    <div className="space-y-3">
      {acts.map((a) => {
        const st = activityDisplayStatus(a);
        const actual = activityActual(a);
        const planned = activityPlanned(a);
        const gap = actual !== null && planned !== null ? actual - planned : null;
        return (
          <div key={a.id} className="rounded-xl border border-slate-200 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <Link href={`/activities/${a.id}`} className="font-semibold text-slate-900 hover:text-blue-700">{a.title}</Link>
              <Pill className={actTone[st]}>{ACTIVITY_STATUS_LABEL[st]}</Pill>
            </div>
            <SeProgress value={actual} planned={planned} size="md" />
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>Prévu {fmtPct(planned)}</span>
              <span>Réalisé {fmtPct(actual)}</span>
              <span className={gap !== null && gap < -10 ? "font-semibold text-red-600" : ""}>
                Écart {gap === null ? "—" : `${gap > 0 ? "+" : ""}${Math.round(gap)} %`}
              </span>
              <span>{fmtDate(a.startDate)} → {fmtDate(a.endDate)}</span>
              {a.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{a.location}</span>}
              {toNum(a.budget) !== null && <span>Budget {fmtMoney(toNum(a.budget))}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------
// JALONS
// ------------------------------------------------------------

export function MilestonesTab({ m }: { m: ProjectMonitoring }) {
  const list = [...(m.project.milestones ?? [])].sort(
    (a, b) => new Date(a.dueDate ?? 0).getTime() - new Date(b.dueDate ?? 0).getTime()
  );
  if (!list.length) return <EmptyState>Aucun jalon pour ce projet.</EmptyState>;

  return (
    <ol className="relative space-y-4 border-l-2 border-slate-200 pl-5">
      {list.map((ms) => {
        const overdue = isMilestoneOverdue(ms);
        const done = milestoneActual(ms) >= 100;
        const delay = milestoneDelayDays(ms);
        return (
          <li key={ms.id} className="relative">
            <span className={`absolute -left-[29px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white ${done ? "bg-emerald-500" : overdue ? "bg-red-500" : "bg-blue-500"}`} />
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{ms.title}</p>
                {done ? <Pill className="bg-emerald-100 text-emerald-700">Terminé</Pill>
                  : overdue ? <Pill className="bg-red-100 text-red-700">En retard · {delay} j</Pill>
                  : <Pill className="bg-blue-100 text-blue-700">À venir</Pill>}
              </div>
              <SeProgress value={milestoneActual(ms)} size="sm" />
              <p className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Flag className="h-3 w-3" />Prévu {fmtDate(ms.dueDate)}</span>
                {ms.completedAt && <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Réel {fmtDate(ms.completedAt)}</span>}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ------------------------------------------------------------
// BÉNÉFICIAIRES
// ------------------------------------------------------------

export function BeneficiariesTab({ m }: { m: ProjectMonitoring }) {
  const b = m.beneficiaries;
  const localities = Object.entries(b.byLocality).sort((x, y) => y[1] - x[1]).slice(0, 8);
  const max = Math.max(...localities.map((l) => l[1]), 1);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Atteints" value={b.total} hint={b.target ? `Cible : ${b.target}` : "Cible non définie"} icon={Users} progress={b.progress} />
        <Kpi label="Femmes" value={b.women} hint={b.total ? fmtPct((b.women / b.total) * 100) : undefined} />
        <Kpi label="Hommes" value={b.men} hint={b.total ? fmtPct((b.men / b.total) * 100) : undefined} />
        <Kpi label="Vulnérables" value={b.vulnerable} hint={`${b.youth} jeune(s) < 25 ans`} />
      </div>

      <Section title="Répartition par zone / localité">
        {localities.length === 0 ? <EmptyState>Aucun bénéficiaire enregistré.</EmptyState> : (
          <ul className="space-y-2">
            {localities.map(([name, n]) => (
              <li key={name} className="text-xs">
                <div className="mb-0.5 flex justify-between"><span className="text-slate-700">{name}</span><b>{n}</b></div>
                <div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-rose-400" style={{ width: `${(n / max) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

// ------------------------------------------------------------
// BUDGET (comparé à l'avancement)
// ------------------------------------------------------------

export function BudgetTab({ m }: { m: ProjectMonitoring }) {
  const { planned, spent, remaining, executionPct } = m.budget;
  const diff = executionPct !== null && m.actualProgress !== null ? executionPct - m.actualProgress : null;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Budget prévu" value={fmtMoney(planned)} icon={Wallet} />
        <Kpi label="Dépensé" value={fmtMoney(spent)} hint={spent === null ? "Non renseigné" : undefined} />
        <Kpi label="Restant" value={fmtMoney(remaining)} />
        <Kpi label="Taux d'exécution" value={fmtPct(executionPct)} progress={executionPct} />
      </div>

      <Section title="Budget vs avancement physique">
        {executionPct === null ? (
          <EmptyState>
            Le budget consommé n&apos;est pas encore enregistré (aucun champ <code>budgetSpent</code> côté API).
            Dès qu&apos;il sera fourni, l&apos;écart avec l&apos;avancement sera comparé ici et déclenchera des alertes.
          </EmptyState>
        ) : (
          <div className="space-y-3">
            <SeProgress value={m.actualProgress} label="Avancement physique" />
            <SeProgress value={executionPct} label="Budget exécuté" tone="bg-amber-500" />
            {diff !== null && diff > 15 && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                ⚠ Exécution budgétaire supérieure de {Math.round(diff)} points à l&apos;avancement : anomalie potentielle.
              </p>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}

// ------------------------------------------------------------
// ÉVALUATIONS
// ------------------------------------------------------------

export function EvaluationsTab({ m }: { m: ProjectMonitoring }) {
  const list = m.project.evaluations ?? [];
  if (!list.length)
    return <EmptyState>Aucune évaluation liée à ce projet. <Link className="font-semibold text-blue-700" href="/evaluations/create">Créer une évaluation</Link></EmptyState>;

  return (
    <ul className="space-y-2">
      {list.map((e) => (
        <li key={e.id} className="rounded-xl border border-slate-200 p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <Link href={`/evaluations/${e.id}`} className="font-semibold text-slate-900 hover:text-blue-700">{e.title}</Link>
            <Pill className="bg-slate-100 text-slate-700">{e.status}</Pill>
          </div>
          <SeProgress value={typeof e.score === "number" ? e.score : null} size="sm" />
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3 w-3" />{fmtDate(e.evaluatedAt)}</p>
        </li>
      ))}
    </ul>
  );
}
