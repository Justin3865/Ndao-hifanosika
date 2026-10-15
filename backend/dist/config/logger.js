"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const getTimestamp = () => {
    return new Date().toISOString();
};
exports.logger = {
    info(message, ...args) {
        console.log(`[${getTimestamp()}] [INFO] ${message}`, ...args);
    },
    success(message, ...args) {
        console.log(`[${getTimestamp()}] [SUCCESS] ${message}`, ...args);
    },
    warn(message, ...args) {
        console.warn(`[${getTimestamp()}] [WARN] ${message}`, ...args);
    },
    error(message, ...args) {
        console.error(`[${getTimestamp()}] [ERROR] ${message}`, ...args);
    },
    debug(message, ...args) {
        if (process.env.NODE_ENV === "development") {
            console.debug(`[${getTimestamp()}] [DEBUG] ${message}`, ...args);
        }
    },
};
//# sourceMappingURL=logger.js.map