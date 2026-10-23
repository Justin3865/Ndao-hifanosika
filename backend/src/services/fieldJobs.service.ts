import { prisma } from "../config/database";
import { logger } from "../config/logger";
import { emitToUser } from "../realtime/socket";
import { onlineIds, onlineSince } from "../realtime/presence";
import { notifyUsers } from "../utils/notify";
import { AGENT_ROLES, housekeeping } from "./field.service";

/**
 * Tâches automatiques du suivi terrain :
 *  1. Agent CONNECTÉ mais sans mission / sans GPS  -> notification « activez votre GPS »
 *  2. Agent EN MISSION dont le signal GPS est perdu -> notification « vérifiez votre localisation »
 *  3. Nettoyage : trajets > 90 jours supprimés, missions oubliées clôturées
 */

const CHECK_EVERY_MS = 60_000;
const GRACE_MS = 2 * 60_000; // laisse 2 min à l'agent pour démarrer sa mission après connexion
const REMIND_EVERY_MS = Number(process.env.GPS_REMINDER_MINUTES ?? 30) * 60_000;
const LOST_AFTER_MS = 3 * 60_000;
const LOST_REMIND_EVERY_MS = 15 * 60_000;

const lastReminder = new Map<number, number>();
const lastLostReminder = new Map<number, number>();

async function remindMissingGps() {
  const online = onlineIds();
  if (online.length === 0) return;

  const [agents, active] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: online }, status: "ACTIVE", role: { in: AGENT_ROLES as never[] } },
      select: { id: true, locationUpdatedAt: true },
    }),
    prisma.mission.findMany({ where: { endedAt: null, agentId: { in: online } }, select: { agentId: true } }),
  ]);

  const onMission = new Set(active.map((m) => m.agentId));
  const now = Date.now();

  // 1) Connectés sans GPS actif
  const missing = agents.filter((a) => {
    if (onMission.has(a.id)) return false;
    const since = onlineSince(a.id);
    if (!since || now - since < GRACE_MS) return false;
    return now - (lastReminder.get(a.id) ?? 0) >= REMIND_EVERY_MS;
  });

  for (const agent of missing) {
    lastReminder.set(agent.id, now);

    await notifyUsers([agent.id], {
      title: "GPS non activé",
      message:
        "Vous êtes connecté mais votre position n'est pas partagée. Activez le GPS de votre appareil, puis ouvrez « Ma mission (GPS) » et appuyez sur « Démarrer la mission ».",
      type: "WARNING",
    });

    emitToUser(agent.id, "mission:remind", { reason: "no_gps" });
  }

  // 2) En mission mais signal perdu (GPS coupé, autorisation retirée...)
  for (const agent of agents.filter((a) => onMission.has(a.id))) {
    const lastSignal = agent.locationUpdatedAt?.getTime() ?? 0;

    if (now - lastSignal > LOST_AFTER_MS && now - (lastLostReminder.get(agent.id) ?? 0) >= LOST_REMIND_EVERY_MS) {
      lastLostReminder.set(agent.id, now);

      await notifyUsers([agent.id], {
        title: "Signal GPS perdu",
        message: "Votre mission est en cours mais aucune position n'est reçue. Vérifiez que la localisation de votre appareil est activée.",
        type: "WARNING",
      });

      emitToUser(agent.id, "mission:remind", { reason: "signal_lost" });
    }
  }

  // Ménage des compteurs
  for (const map of [lastReminder, lastLostReminder]) {
    if (map.size > 2000) for (const [id, at] of map) if (now - at > 24 * 3600 * 1000) map.delete(id);
  }
}

export function startFieldJobs(): void {
  const safe = (name: string, fn: () => Promise<void>) => () =>
    fn().catch((error) => logger.error(`Tâche terrain « ${name} » en erreur`, error));

  setInterval(safe("rappel GPS", remindMissingGps), CHECK_EVERY_MS).unref();
  setInterval(safe("nettoyage", housekeeping), 6 * 3600 * 1000).unref();
  void safe("nettoyage", housekeeping)();

  logger.success("Tâches automatiques du suivi terrain démarrées");
}
