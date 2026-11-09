// src/services/performanceDrop.service.ts  (AJOUT) — alerte RH « performance en baisse » (§5.3).
// Source : évaluations de personnes soumises/validées (hors auto-évaluation). Notification RH dédupliquée sur 30 jours.
import { db } from "../utils/db";
import { notifyUsers } from "../utils/notify";
import { detectDrop, dropOptionsFromEnv, type DropResult, type ScorePoint } from "../utils/performanceDropRules";

export interface DropRow extends DropResult { targetType: string; targetId: number; name: string }

type EvalRow = { targetType: string; targetId: number; totalScore: number | null; createdAt: Date };

export async function findPerformanceDrops(): Promise<DropRow[]> {
  const opts = dropOptionsFromEnv();
  const rows = (await db.personEvaluation.findMany({
    where: { targetType: { in: ["MEMBER", "STAGIAIRE"] }, status: { in: ["SUBMITTED", "VALIDATED"] }, evaluatorRole: { not: "SELF" }, totalScore: { not: null } },
    select: { targetType: true, targetId: true, totalScore: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })) as EvalRow[];

  const groups = new Map<string, { targetType: string; targetId: number; points: ScorePoint[] }>();
  for (const r of rows) {
    if (r.totalScore === null) continue;
    const k = `${r.targetType}:${r.targetId}`;
    const g = groups.get(k) ?? { targetType: r.targetType, targetId: r.targetId, points: [] };
    g.points.push({ at: r.createdAt, score: r.totalScore });
    groups.set(k, g);
  }

  const hits = [...groups.values()].map((g) => ({ g, res: detectDrop(g.points, opts) })).filter((x) => x.res.dropped);
  if (!hits.length) return [];
  const users = (await db.user.findMany({ where: { id: { in: hits.map((h) => h.g.targetId) } }, select: { id: true, firstName: true, lastName: true } })) as Array<{ id: number; firstName: string; lastName: string }>;
  const nameOf = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));
  return hits.map(({ g, res }) => ({ ...res, targetType: g.targetType, targetId: g.targetId, name: nameOf.get(g.targetId) ?? `Personne #${g.targetId}` }));
}

/** Notifie la RH (et l'ADMIN) une seule fois par cas et par période de 30 jours. Retourne le nombre de notifications créées. */
export async function notifyPerformanceDrops(): Promise<number> {
  const drops = await findPerformanceDrops();
  if (!drops.length) return 0;
  const recipients = (await db.user.findMany({ where: { status: "ACTIVE", role: { in: ["RH", "ADMIN"] } }, select: { id: true } })) as Array<{ id: number }>;
  if (!recipients.length) return 0;
  const since = new Date(Date.now() - 30 * 86_400_000);
  let created = 0;
  for (const d of drops) {
    const tag = `[perf:${d.targetType}:${d.targetId}]`;
    const already = await db.notification.findFirst({ where: { message: { contains: tag }, createdAt: { gte: since } }, select: { id: true } });
    if (already) continue;
    await notifyUsers(recipients.map((r) => r.id), {
      title: "Performance en baisse",
      message: `${d.name} : dernière note ${d.last} contre ${d.baseline} en moyenne avant (−${d.dropPercent} %). À examiner avec le tuteur. ${tag}`,
      type: "WARNING",
      channels: "app",
    });
    created += 1;
  }
  return created;
}
