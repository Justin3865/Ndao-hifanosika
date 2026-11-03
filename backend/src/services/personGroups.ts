import { loadInternshipsMonitoring } from "./internshipMonitoring.service";
import { loadStudentMaps, personKeyOf } from "./finalEvaluation.service";

/**
 * Un stagiaire = UNE ligne (même règle que la liste « Stages » et l'« Évaluation finale » :
 * même CIN à 12 chiffres, sinon même compte). 20 stages pour 12 personnes → 12 lignes.
 *
 * Le stage retenu est le plus pertinent : en cours / terminé d'abord, puis le plus récent.
 */
export type StageRow = Awaited<ReturnType<typeof loadInternshipsMonitoring>>[number];
export type PersonRow = StageRow & { personKey: string; stagesCount: number; stageIds: number[] };

const operational = (row: StageRow) => (row.internship.status === "IN_PROGRESS" || row.internship.status === "COMPLETED" ? 1 : 0);

export function pickOnePerPerson(rows: StageRow[], cinOf: Map<number, string | null>): PersonRow[] {
  const groups = new Map<string, StageRow[]>();

  for (const row of rows) {
    const key = personKeyOf(row.internship.studentId, cinOf.get(row.internship.studentId));
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const out: PersonRow[] = [];

  for (const [personKey, group] of groups) {
    const sorted = [...group].sort(
      (a, b) =>
        operational(b) - operational(a) ||
        new Date(b.internship.startDate).getTime() - new Date(a.internship.startDate).getTime() ||
        b.internship.id - a.internship.id,
    );
    out.push({ ...sorted[0], personKey, stagesCount: group.length, stageIds: sorted.map((r) => r.internship.id) });
  }

  return out;
}

/** Charge les stages et ne garde qu'une ligne par personne. */
export async function loadOnePerPerson(scope: Record<string, unknown> = {}, extraWhere: Record<string, unknown> = {}): Promise<PersonRow[]> {
  const rows = await loadInternshipsMonitoring(scope, extraWhere);
  const { cinOf } = await loadStudentMaps(rows);
  return pickOnePerPerson(rows, cinOf);
}
