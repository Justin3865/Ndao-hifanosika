#!/usr/bin/env python3
"""Manamboatra ny 3 diso `npm run typecheck` (idempotent). Alefa avy ao amin'ny C:\\ndao-hifanosika :
   python appliquer-typecheck.py [lalana-frontend]"""
import sys, os, re

root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.getcwd(), "frontend")
src = os.path.join(root, "src")

def rd(p):
    with open(p, "rb") as f: raw = f.read().decode("utf-8")
    return raw, ("\r\n" if "\r\n" in raw else "\n")
def wr(p, t, nl):
    with open(p, "wb") as f: f.write(t.replace("\r\n", "\n").replace("\n", nl).encode("utf-8"))

# 1) MessageComposer : prop allowSchedule
p = os.path.join(src, "components/notifications/MessageComposer.tsx")
t, nl = rd(p); t = t.replace("\r\n", "\n")
if "allowSchedule" in t:
    print("MessageComposer : efa vita")
else:
    m = re.search(r"interface Props \{\n", t)
    if not m: sys.exit("Tsy hita : interface Props ao amin'ny MessageComposer.tsx")
    add = ("  /** Programmation de l'envoi : gérée par la page qui utilise le composeur (accepté ici pour le typage). */\n"
           "  allowSchedule?: boolean;\n")
    t = t[:m.end()] + add + t[m.end():]
    wr(p, t, nl); print("MessageComposer : allowSchedule nampiana")

# 2) ReportPdfSheets : OverviewPage + ImpactPage
p = os.path.join(src, "components/reports/ReportPdfSheets.tsx")
t, nl = rd(p); t = t.replace("\r\n", "\n")
if "export function OverviewPage" in t:
    print("ReportPdfSheets : efa vita")
else:
    def rep(old, new):
        global t
        if t.count(old) != 1: sys.exit("Anchor tsy hita/tsy tokana: " + old[:60])
        t = t.replace(old, new)
    rep("  /** Page de mesure (hors écran) : pas exportée */\n  probe?: boolean;\n",
        "  /** Page de mesure (hors écran) : pas exportée */\n  probe?: boolean;\n"
        "  /** Étiquette sous le titre (défaut : Bailleurs) */\n  badge?: string;\n"
        "  /** Phrase du pied de page */\n  footer?: string;\n")
    rep("function Page({ title, issued, number, total, probe = false, children }: PageProps) {",
        "function Page({ title, issued, number, total, probe = false, badge = \"Bailleurs\", footer = \"Rapport destiné au suivi du financement et des résultats\", children }: PageProps) {")
    rep("                Bailleurs — édité le {issued.date}", "                {badge} — édité le {issued.date}")
    rep("{ORG.name} · Rapport destiné au suivi du financement et des résultats · Page {number}/{total}",
        "{ORG.name} · {footer} · Page {number}/{total}")
    t = t.rstrip("\n") + '''

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
'''
    wr(p, t, nl); print("ReportPdfSheets : OverviewPage + ImpactPage nampiana")
