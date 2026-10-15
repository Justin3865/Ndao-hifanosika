"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const logger_1 = require("./config/logger");
async function startServer() {
    try {
        await (0, database_1.connectDatabase)();
        const server = app_1.default.listen(env_1.env.PORT, () => {
            logger_1.logger.success(`Serveur démarré sur http://localhost:${env_1.env.PORT}`);
            logger_1.logger.info(`API disponible sur http://localhost:${env_1.env.PORT}/api`);
            logger_1.logger.info(`Health check : http://localhost:${env_1.env.PORT}/health`);
        });
        const shutdown = async (signal) => {
            logger_1.logger.info(`${signal} reçu. Arrêt du serveur...`);
            server.close(async () => {
                await (0, database_1.disconnectDatabase)();
                logger_1.logger.success("Serveur arrêté proprement");
                process.exit(0);
            });
        };
        process.on("SIGINT", () => {
            void shutdown("SIGINT");
        });
        process.on("SIGTERM", () => {
            void shutdown("SIGTERM");
        });
    }
    catch (error) {
        logger_1.logger.error(error instanceof Error
            ? error.message
            : "Erreur lors du démarrage du serveur");
        await (0, database_1.disconnectDatabase)();
        process.exit(1);
    }
}
void startServer();
//# sourceMappingURL=server.js.map