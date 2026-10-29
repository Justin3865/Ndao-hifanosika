"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ORG, orgContactLine } from "@/lib/org";
import { Logo } from "@/components/brand/Logo";

export interface DashboardData {
  totals: Record<string, number>;
  status: Record<string, number>;
}

export interface EvaluationReport {
  total: number;
  averageScore: number | null;
  byStatus: { draft: number; submitted: number; validated: number };
}

export interface ZoneRow {
  city: string;
  activities: number;
  projects: number;
  beneficiaries: number;
}

export const REPORT_LABELS: Record<string, string> = {
  projects: "Projets",
  beneficiaries: "Bénéficiaires",
  users: "Utilisateurs",
  evaluations: "Évaluations",
  internships: "Stages",
  activities: "Activités",
  activeProjects: "Projets actifs",
  completedProjects: "Projets terminés",
  activeUsers: "Utilisateurs actifs",
  completedInternships: "Stages terminés",
};

/** Dimensions d'une page A4 à 96 dpi (le PDF et l'impression la mettent à l'échelle A4 ou A3) */
const PAGE_W = 794;
const PAGE_H = 1123;
const BLOCK_GAP = 32; // = space-y-8

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Date et heure d'édition à l'heure de Madagascar (UTC+3, sans heure d'été),
 * indépendamment du fuseau de l'ordinateur (même méthode que le certificat).
 */
export function formatIssued(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };

  const mg = new Date(d.getTime() + 3 * 60 * 60 * 1000);
  const two = (n: number) => String(n).padStart(2, "0");

  return {
    date: `${two(mg.getUTCDate())}/${two(mg.getUTCMonth() + 1)}/${mg.getUTCFullYear()}`,
    time: `${two(mg.getUTCHours())}:${two(mg.getUTCMinutes())}:${two(mg.getUTCSeconds())}`,
  };
}

/**
 * Le rapport est une feuille blanche (comme le certificat) : on neutralise le mode sombre
 * (règles globales `.dark ...` avec !important) et la règle globale `* { border-color }`
 * pour que texte et cadre gardent leurs couleurs, à l'écran, à l'impression et dans le PDF.
 */
const LIGHT_SHEET_CSS = `
.report-sheet, .dark .report-sheet { background-color: #ffffff !important; color: #1f2937 !important; color-scheme: light; }
.report-sheet .bg-white, .dark .report-sheet .bg-white { background-color: #ffffff !important; }
.report-sheet .text-gray-800, .dark .report-sheet .text-gray-800 { color: #1f2937 !important; }
.report-sheet .text-gray-700, .dark .report-sheet .text-gray-700 { color: #374151 !important; }
.report-sheet .text-gray-600, .dark .report-sheet .text-gray-600 { color: #4b5563 !important; }
.report-sheet .text-gray-500, .dark .report-sheet .text-gray-500 { color: #6b7280 !important; }
.report-sheet .text-blue-900, .dark .report-sheet .text-blue-900 { color: #1e3a8a !important; }
.report-sheet strong, .dark .report-sheet strong { color: #111827 !important; }
.report-sheet .border-gray-200, .dark .report-sheet .border-gray-200 { border-color: #e5e7eb !important; }
.report-sheet .rs-frame { border-color: #0F6BA0 !important; }
.report-sheet .rs-inner { border-color: rgba(27, 154, 160, 0.6) !important; }
.report-sheet .rs-tile { border-color: rgba(15, 107, 160, 0.2) !important; }
.report-sheet .rs-title { border-color: rgba(27, 154, 160, 0.4) !important; }
.report-sheet .rs-corner-tl { border-color: #E4156C transparent transparent #E4156C !important; }
.report-sheet .rs-corner-tr { border-color: #E4156C #E4156C transparent transparent !important; }
.report-sheet .rs-corner-bl { border-color: transparent transparent #E4156C #E4156C !important; }
.report-sheet .rs-corner-br { border-color: transparent #E4156C #E4156C transparent !important; }
.report-sheet table, .dark .report-sheet table { background-color: #ffffff !important; color: #1f2937 !important; }
.report-sheet table thead, .dark .report-sheet table thead,
.report-sheet table thead tr, .dark .report-sheet table thead tr,
.report-sheet table tbody, .dark .report-sheet table tbody,
.report-sheet table tbody tr, .dark .report-sheet table tbody tr { background-color: #ffffff !important; }
.report-sheet table thead th, .dark .report-sheet table thead th { color: #0A4A70 !important; font-weight: 700; border-bottom: 2px solid #1B9AA0 !important; }
.report-sheet table tbody td, .dark .report-sheet table tbody td { color: #1f2937 !important; border-bottom: 1px solid #e5e7eb !important; }

/* La mesure se fait hors écran et n'est jamais imprimée */
.report-probe { position: absolute; left: -10000px; top: 0; visibility: hidden; pointer-events: none; }
@media print { .report-probe { display: none !important; } }
`;

interface PageProps {
  title: string;
  issued: { date: string; time: string };
  number: number;
  total: number;
  /** Page de mesure (hors écran) : pas exportée */
  probe?: boolean;
  /** Étiquette sous le titre (défaut : Bailleurs) */
  badge?: string;
  /** Phrase du pied de page */
  footer?: string;
  children: ReactNode;
}

/** Page A4 (portrait) avec le même cadre que le certificat : liseré bleu, filet turquoise, coins roses. */
function Page({ title, issued, number, total, probe = false, badge = "Bailleurs", footer = "Rapport destiné au suivi du financement et des résultats", children }: PageProps) {
  const pageAttr = probe ? { "data-probe-page": "" } : { "data-report-page": "" };
  const bodyAttr = probe ? { "data-probe-body": "" } : {};

  return (
    <div
      {...pageAttr}
      className="report-sheet relative flex bg-white p-3 text-gray-800"
      style={probe ? { width: PAGE_W, minHeight: PAGE_H } : { width: PAGE_W, height: PAGE_H }}
    >
      <div className="rs-frame flex flex-1 border-[3px] border-[#0F6BA0] p-1.5">
        <div className="rs-inner relative flex flex-1 flex-col overflow-hidden border border-[#1B9AA0]/60 px-10 py-8">
          <span className="rs-corner-tl pointer-events-none absolute -left-px -top-px h-7 w-7 border-l-4 border-t-4 border-[#E4156C]" />
          <span className="rs-corner-tr pointer-events-none absolute -right-px -top-px h-7 w-7 border-r-4 border-t-4 border-[#E4156C]" />
          <span className="rs-corner-bl pointer-events-none absolute -bottom-px -left-px h-7 w-7 border-b-4 border-l-4 border-[#E4156C]" />
          <span className="rs-corner-br pointer-events-none absolute -bottom-px -right-px h-7 w-7 border-b-4 border-r-4 border-[#E4156C]" />

          {/* Filigrane : logo en transparence */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logos/ndao-hifanosika.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.05]"
          />

          <div className="relative z-10 flex flex-1 flex-col">
            {/* En-tête */}
            <div className="text-center">
              <div className="flex justify-center"><Logo size={56} /></div>
              <p className="mt-2 text-[11px] text-gray-500">{ORG.name} — {ORG.address}</p>
              {orgContactLine() && <p className="text-[11px] text-gray-500">{orgContactLine()}</p>}

              <h1 className="mt-4 text-3xl font-extrabold uppercase tracking-[0.2em] text-[#0F6BA0]">{title}</h1>
              <div className="mx-auto mt-2 flex h-1 w-40 overflow-hidden rounded-full">
                <span className="h-full flex-1 bg-[#0F6BA0]" />
                <span className="h-full flex-1 bg-[#1B9AA0]" />
                <span className="h-full flex-1 bg-[#E4156C]" />
              </div>
              {/* Date + heure d'édition : toujours affichées */}
              <p className="mx-auto mt-2 w-fit rounded-full bg-[#0F6BA0]/10 px-4 py-0.5 text-xs font-semibold text-[#0A4A70]">
                {badge} — édité le {issued.date} à <span className="font-mono">{issued.time}</span>
              </p>
            </div>

            <div {...bodyAttr} className="mt-8 flex-1 space-y-8">{children}</div>

            <p className="mt-6 border-t border-gray-200 pt-3 text-center text-[11px] text-gray-500">
              {ORG.name} · {footer} · Page {number}/{total}
            </p>
            <p className="mt-0.5 text-center text-[11px] text-gray-500">
              Édité le {issued.date} à <span className="font-mono">{issued.time}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rs-tile rounded-2xl border border-[#0F6BA0]/20 bg-[#0F6BA0]/5 p-4 text-left">
      <p className="text-xs text-gray-600">{label}</p>
      <p className="mt-1 text-3xl font-bold text-[#0A4A70]">{value}</p>
    </div>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="rs-title mb-3 border-b-2 border-[#1B9AA0]/40 pb-1 text-left text-lg font-bold text-[#0A4A70]">{children}</h2>;
}

/* ------------------------------------------------------------------ */
/* Blocs insécables du rapport                                         */
/* ------------------------------------------------------------------ */

type Block = { kind: "figures" } | { kind: "quality" } | { kind: "zones"; rows: ZoneRow[]; cont: boolean };

interface Data {
  dashboard: DashboardData | null;
  evaluation: EvaluationReport | null;
}

function FiguresBlock({ dashboard }: Pick<Data, "dashboard">) {
  const totals = dashboard?.totals ?? {};

  return (
    <section data-b="figures">
      <Heading>Chiffres clés</Heading>
      <div className="grid grid-cols-3 gap-4">
        {(
          [
            ["Projets", totals.projects],
            ["Activités", totals.activities],
            ["Bénéficiaires", totals.beneficiaries],
            ["Évaluations", totals.evaluations],
            ["Stages", totals.internships],
            ["Projets terminés", dashboard?.status?.completedProjects],
          ] as [string, number | undefined][]
        ).map(([label, value]) => (
          <Tile key={label} label={label} value={value ?? 0} />
        ))}
      </div>
    </section>
  );
}

function QualityBlock({ evaluation }: Pick<Data, "evaluation">) {
  if (!evaluation) return null;

  return (
    <section data-b="quality">
      <Heading>Qualité et évaluation</Heading>
      <p className="text-left text-sm text-gray-700">
        {evaluation.total} évaluation(s) réalisée(s), score moyen{" "}
        <strong>{evaluation.averageScore !== null ? evaluation.averageScore.toFixed(1) : "—"}/100</strong> ({evaluation.byStatus?.validated ?? 0} validée(s), {evaluation.byStatus?.submitted ?? 0} soumise(s), {evaluation.byStatus?.draft ?? 0} brouillon(s)).
      </p>
    </section>
  );
}

function ZonesBlock({ rows, cont }: { rows: ZoneRow[]; cont: boolean }) {
  return (
    <section data-b="zones">
      <Heading>Zones d&apos;intervention{cont ? " (suite)" : ""}</Heading>
      <table className="w-full text-left text-sm">
        <thead>
          <tr><th className="py-2">Ville</th><th>Projets</th><th>Activités</th><th>Bénéficiaires</th></tr>
        </thead>
        <tbody>
          {rows.map((z) => (
            <tr key={z.city} data-z-row><td className="py-2 font-medium">{z.city}</td><td>{z.projects}</td><td>{z.activities}</td><td>{z.beneficiaries}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function renderBlock(block: Block, data: Data, key: string) {
  if (block.kind === "figures") return <FiguresBlock key={key} dashboard={data.dashboard} />;
  if (block.kind === "quality") return <QualityBlock key={key} evaluation={data.evaluation} />;
  return <ZonesBlock key={key} rows={block.rows} cont={block.cont} />;
}

/**
 * Rapport d'impact (bailleurs) : une seule page tant que le contenu tient ;
 * une page est ajoutée automatiquement dès que la page est pleine.
 * Le contenu est mesuré hors écran, puis réparti page par page.
 */
export function ImpactReport({ dashboard, evaluation, zones }: Data & { zones: ZoneRow[] }) {
  const [issuedAt] = useState(() => new Date().toISOString());
  const [pages, setPages] = useState<Block[][]>([[{ kind: "figures" }, { kind: "quality" }]]);
  const probe = useRef<HTMLDivElement>(null);
  const issued = formatIssued(issuedAt);
  const data: Data = { dashboard, evaluation };

  useIsoLayoutEffect(() => {
    const measure = () => {
      const root = probe.current;
      const page = root?.querySelector<HTMLElement>("[data-probe-page]");
      const body = root?.querySelector<HTMLElement>("[data-probe-body]");
      if (!root || !page || !body) return;

      // Hauteur utile d'une page = page A4 moins l'en-tête, le pied et les cadres
      const avail = PAGE_H - (page.offsetHeight - body.offsetHeight) - 4;
      const height = (selector: string) => root.querySelector<HTMLElement>(selector)?.offsetHeight ?? 0;

      const rowHeights = Array.from(root.querySelectorAll<HTMLElement>("tr[data-z-row]")).map((tr) => tr.offsetHeight);
      const zonesTotal = height("[data-b=zones]");
      const zonesOverhead = zonesTotal - rowHeights.reduce((a, b) => a + b, 0); // titre + en-tête du tableau

      const out: Block[][] = [[]];
      let used = 0;

      const current = () => out[out.length - 1];
      const nextPage = () => {
        out.push([]);
        used = 0;
      };
      const gap = () => (current().length > 0 ? BLOCK_GAP : 0);

      const place = (block: Block, h: number) => {
        if (current().length > 0 && used + gap() + h > avail) nextPage();
        used += gap() + h;
        current().push(block);
      };

      place({ kind: "figures" }, height("[data-b=figures]"));
      if (evaluation) place({ kind: "quality" }, height("[data-b=quality]"));

      let index = 0;
      while (index < zones.length) {
        let h = zonesOverhead;
        let take = 0;

        while (index + take < zones.length && used + gap() + h + rowHeights[index + take] <= avail) {
          h += rowHeights[index + take];
          take++;
        }

        if (take === 0) {
          if (current().length > 0) {
            nextPage();
            continue;
          }
          take = 1; // page vide et ligne trop haute : on la place quand même
          h += rowHeights[index];
        }

        used += gap() + h;
        current().push({ kind: "zones", rows: zones.slice(index, index + take), cont: index > 0 });
        index += take;
      }

      setPages(out);
    };

    measure();
    // Les polices peuvent changer les hauteurs : on remesure quand elles sont prêtes
    document.fonts?.ready.then(measure).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboard, evaluation, zones]);

  return (
    <>
      <style>{LIGHT_SHEET_CSS}</style>

      {/* Mesure hors écran : tout le contenu sur une page de test */}
      <div ref={probe} className="report-probe" aria-hidden="true" style={{ width: PAGE_W }}>
        <Page title="Rapport d'impact" issued={issued} number={1} total={1} probe>
          <FiguresBlock dashboard={dashboard} />
          <QualityBlock evaluation={evaluation} />
          {zones.length > 0 && <ZonesBlock rows={zones} cont={false} />}
        </Page>
      </div>

      {pages.map((blocks, i) => (
        <div key={i} className="report-page-wrap shadow-xl print:shadow-none">
          <Page title="Rapport d'impact" issued={issued} number={i + 1} total={pages.length}>
            {blocks.map((block, j) => renderBlock(block, data, `${i}-${j}`))}
          </Page>
        </div>
      ))}
    </>
  );
}

/** Rapport d'impact : même rendu que ImpactReport (utilisé par « Télécharger tout »). */
export const ImpactPage = ImpactReport;

/** Rapport général : vue d'ensemble + évaluations, sur une page A4 (utilisé par « Télécharger tout »). */
export function OverviewPage({ dashboard, evaluation }: Data) {
  const [issuedAt] = useState(() => new Date().toISOString());
  const issued = formatIssued(issuedAt);
  const entries = Object.entries({ ...(dashboard?.totals ?? {}), ...(dashboard?.status ?? {}) }) as [string, number][];

  return (
    <>
      <style>{LIGHT_SHEET_CSS}</style>
      <div className="report-page-wrap">
        <Page title="Rapport général" issued={issued} number={1} total={1} badge="Rapports" footer="Données agrégées en temps réel">
          <section>
            <Heading>Vue d&apos;ensemble</Heading>
            <div className="grid grid-cols-3 gap-4">
              {entries.map(([key, value]) => (
                <Tile key={key} label={REPORT_LABELS[key] ?? key} value={value} />
              ))}
            </div>
          </section>
          {evaluation && (
            <section>
              <Heading>Évaluations</Heading>
              <div className="grid grid-cols-3 gap-4">
                <Tile label="Total" value={evaluation.total} />
                <Tile label="Score moyen" value={evaluation.averageScore !== null && evaluation.averageScore !== undefined ? evaluation.averageScore.toFixed(1) : "—"} />
                <Tile label="Brouillons" value={evaluation.byStatus?.draft ?? 0} />
                <Tile label="Soumises" value={evaluation.byStatus?.submitted ?? 0} />
                <Tile label="Validées" value={evaluation.byStatus?.validated ?? 0} />
              </div>
            </section>
          )}
        </Page>
      </div>
    </>
  );
}
