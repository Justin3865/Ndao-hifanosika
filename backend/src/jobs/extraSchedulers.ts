// src/jobs/extraSchedulers.ts  (AJOUT) — deux tâches quotidiennes, démarrées depuis server.ts.
//   • Alerte « performance en baisse » : active par défaut (PERF_DROP_ALERTS=false pour couper). Notifications uniquement.
//   • Purge planifiée des journaux techniques : DÉSACTIVÉE par défaut (RETENTION_AUTOPURGE=true pour activer).
//     Même périmètre que la purge manuelle : jamais de données métier. Chaque exécution est inscrite dans le journal d'audit.
import { logger } from "../config/logger";
import { targets } from "../controllers/retention.controller";
import { db } from "../utils/db";
import { notifyPerformanceDrops } from "../services/performanceDrop.service";

const DAY = 86_400_000;

async function purgeOnce(): Promise<void> {
  const { policy, items } = targets();
  const deleted: Record<string, number> = {};
  for (const i of items) deleted[i.key] = Number((await i.model.deleteMany({ where: i.where })).count);
  await db.auditLog.create({ data: { userId: null, action: "RETENTION_PURGE_AUTO", entity: "retention", details: { policy, deleted } } });
  logger.info(`Purge planifiée : ${JSON.stringify(deleted)}`);
}

export function startExtraSchedulers(): void {
  if (process.env.PERF_DROP_ALERTS !== "false") {
    const tick = () => notifyPerformanceDrops().then((n) => { if (n) logger.info(`Performance en baisse : ${n} alerte(s) RH.`); }).catch((e) => logger.error("Alerte performance en baisse", e));
    setTimeout(tick, 150_000).unref?.();
    setInterval(tick, DAY).unref?.();
  }
  if (process.env.RETENTION_AUTOPURGE === "true") {
    const tick = () => purgeOnce().catch((e) => logger.error("Purge planifiée", e));
    setTimeout(tick, 600_000).unref?.();
    setInterval(tick, DAY).unref?.();
    logger.info("Purge planifiée des journaux techniques : activée (quotidienne).");
  }
}
