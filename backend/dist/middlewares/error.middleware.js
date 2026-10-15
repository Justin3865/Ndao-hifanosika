"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = errorMiddleware;
const logger_1 = require("../config/logger");
function errorMiddleware(error, req, res, next) {
    logger_1.logger.error(error instanceof Error
        ? error.message
        : String(error));
    if (res.headersSent) {
        next(error);
        return;
    }
    const statusCode = typeof error?.statusCode === "number"
        ? error.statusCode
        : 500;
    res.status(statusCode).json({
        success: false,
        message: error instanceof Error
            ? error.message
            : "Une erreur interne est survenue",
        ...(process.env.NODE_ENV === "development"
            ? {
                error: error instanceof Error
                    ? error.stack
                    : error,
            }
            : {}),
    });
}
//# sourceMappingURL=error.middleware.js.map