import http from "http";
import app from "./app";
import { initSocket } from "./realtime/socket";
import { startFieldJobs } from "./services/fieldJobs.service";
import { startScheduledMessageWorker } from "./controllers/notification.controller";
import { ensureDefaultZones } from "./routes/zones.routes";
import { env } from "./config/env";
import {
  connectDatabase,
  disconnectDatabase,
} from "./config/database";
import { logger } from "./config/logger";
import { startActivityReminders } from "./services/activityReminders.service";
import { startReminderScheduler } from "./services/reminders.service";

async function startServer() {
  try {
    await connectDatabase();

    const server = http.createServer(app);
    initSocket(server);
    void ensureDefaultZones();
    startReminderScheduler();
    startActivityReminders();
    startFieldJobs();
    startScheduledMessageWorker();

    server.listen(env.PORT, () => {
      logger.success(
        `Serveur démarré sur http://localhost:${env.PORT}`,
      );
      logger.info(
        `API disponible sur http://localhost:${env.PORT}/api`,
      );
      logger.info(
        `Health check : http://localhost:${env.PORT}/health`,
      );
    });

    const shutdown = async (signal: string) => {
      logger.info(`${signal} reçu. Arrêt du serveur...`);

      server.close(async () => {
        await disconnectDatabase();
        logger.success("Serveur arrêté proprement");
        process.exit(0);
      });
    };

    process.on("SIGINT", () => {
      void shutdown("SIGINT");
    });

    process.on("SIGTERM", () => {
      void shutdown("SIGTERM");
    });
  } catch (error) {
    logger.error(
      error instanceof Error
        ? error.message
        : "Erreur lors du démarrage du serveur",
    );

    await disconnectDatabase();
    process.exit(1);
  }
}

void startServer();