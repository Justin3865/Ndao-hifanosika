// Manamboatra ny diso 3 an'ny "npm run typecheck" (azo averina, tsy manova zavatra efa vita).
// Fampiasana (ao amin'ny C:\ndao-hifanosika):   node appliquer-typecheck.js
const fs = require("fs");
const path = require("path");

const root = process.argv[2] || path.join(process.cwd(), "frontend");
const src = path.join(root, "src");

function read(p) {
  const raw = fs.readFileSync(p, "utf8");
  return { text: raw.replace(/\r\n/g, "\n"), nl: raw.includes("\r\n") ? "\r\n" : "\n" };
}
function write(p, text, nl) { fs.writeFileSync(p, text.replace(/\n/g, nl), "utf8"); }
function once(t, old, neu) {
  if (t.split(old).length !== 2) { console.error("Anchor tsy hita/tsy tokana: " + old.slice(0, 60)); process.exit(1); }
  return t.replace(old, () => neu);
}

// 1) MessageComposer : prop allowSchedule
{
  const p = path.join(src, "components/notifications/MessageComposer.tsx");
  let { text: t, nl } = read(p);
  if (t.includes("allowSchedule")) console.log("MessageComposer : efa vita");
  else {
    const m = /interface Props \{\n/.exec(t);
    if (!m) { console.error("Tsy hita : interface Props ao amin'ny MessageComposer.tsx"); process.exit(1); }
    const add = "  /** Programmation de l'envoi : gérée par la page qui utilise le composeur (accepté ici pour le typage). */\n  allowSchedule?: boolean;\n";
    t = t.slice(0, m.index + m[0].length) + add + t.slice(m.index + m[0].length);
    write(p, t, nl); console.log("MessageComposer : allowSchedule nampiana");
  }
}

// 1b) MessageComposer : prop onDiscardDraft (appelée quand on clique « Effacer » sur le brouillon retrouvé)
{
  const p = path.join(src, "components/notifications/MessageComposer.tsx");
  let { text: t, nl } = read(p);
  if (t.includes("onDiscardDraft")) console.log("MessageComposer : onDiscardDraft efa vita");
  else {
    t = once(t, "interface Props {\n", "interface Props {\n  /** Appelée quand le brouillon retrouvé est effacé (le parent remet son formulaire à zéro). */\n  onDiscardDraft?: () => void;\n");
    if (!t.includes("}: Props) {")) { console.error("Tsy hita : '}: Props) {' ao amin'ny MessageComposer.tsx"); process.exit(1); }
    t = t.replace(/(\n)(\s*)\}: Props\) \{/, "$1  onDiscardDraft,$1$2}: Props) {");
    const eff = /(\n(\s*)setRestored\(false\);\n)(\s*\}\}\n\s*>\s*\n\s*Effacer)/;
    if (eff.test(t)) t = t.replace(eff, "$1$2onDiscardDraft?.();\n$3");
    else console.log("Fanamarihana: tsy hita ny bokotra « Effacer » ; ny prop ihany no nampiana.");
    write(p, t, nl); console.log("MessageComposer : onDiscardDraft nampiana");
  }
}

// 2) ReportPdfSheets : OverviewPage + ImpactPage
{
  const p = path.join(src, "components/reports/ReportPdfSheets.tsx");
  let { text: t, nl } = read(p);
  if (t.includes("export function OverviewPage")) console.log("ReportPdfSheets : efa vita");
  else {
    t = once(t, "  /** Page de mesure (hors écran) : pas exportée */\n  probe?: boolean;\n",
      "  /** Page de mesure (hors écran) : pas exportée */\n  probe?: boolean;\n  /** Étiquette sous le titre (défaut : Bailleurs) */\n  badge?: string;\n  /** Phrase du pied de page */\n  footer?: string;\n");
    t = once(t, "function Page({ title, issued, number, total, probe = false, children }: PageProps) {",
      'function Page({ title, issued, number, total, probe = false, badge = "Bailleurs", footer = "Rapport destiné au suivi du financement et des résultats", children }: PageProps) {');
    t = once(t, "                Bailleurs — édité le {issued.date}", "                {badge} — édité le {issued.date}");
    t = once(t, "{ORG.name} · Rapport destiné au suivi du financement et des résultats · Page {number}/{total}",
      "{ORG.name} · {footer} · Page {number}/{total}");
    t = t.replace(/\n+$/, "") + `

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
`;
    write(p, t, nl); console.log("ReportPdfSheets : OverviewPage + ImpactPage nampiana");
  }
}
