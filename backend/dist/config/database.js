"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.connectDatabase = connectDatabase;
exports.disconnectDatabase = disconnectDatabase;
const client_1 = require("../../generated/prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const env_1 = require("./env");
const adapter = new adapter_pg_1.PrismaPg({
    connectionString: env_1.env.DATABASE_URL,
});
exports.prisma = new client_1.PrismaClient({
    adapter,
    log: env_1.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
});
async function connectDatabase() {
    await exports.prisma.$connect();
}
async function disconnectDatabase() {
    await exports.prisma.$disconnect();
}
//# sourceMappingURL=database.js.map