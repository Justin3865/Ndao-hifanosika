"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditMiddleware = auditMiddleware;
const database_1 = require("../config/database");
async function auditMiddleware(req, res, next) {
    const authenticatedRequest = req;
    const originalEnd = res.end.bind(res);
    res.end = function (...args) {
        void (async () => {
            try {
                await database_1.prisma.auditLog.create({
                    data: {
                        userId: authenticatedRequest.user?.id ?? null,
                        action: `${req.method} ${req.originalUrl}`,
                        entity: req.baseUrl || null,
                        details: {
                            statusCode: res.statusCode,
                            method: req.method,
                            path: req.originalUrl,
                        },
                        ipAddress: req.ip ||
                            req.socket.remoteAddress ||
                            null,
                        userAgent: req.headers["user-agent"] ||
                            null,
                    },
                });
            }
            catch {
            }
        })();
        return originalEnd(...args);
    };
    next();
}
//# sourceMappingURL=audit.middleware.js.map