"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const users_routes_1 = __importDefault(require("./routes/users.routes"));
const departements_routes_1 = __importDefault(require("./routes/departements.routes"));
const projects_routes_1 = __importDefault(require("./routes/projects.routes"));
const activities_routes_1 = __importDefault(require("./routes/activities.routes"));
const milestones_routes_1 = __importDefault(require("./routes/milestones.routes"));
const members_routes_1 = __importDefault(require("./routes/members.routes"));
const beneficiaries_routes_1 = __importDefault(require("./routes/beneficiaries.routes"));
const evaluations_routes_1 = __importDefault(require("./routes/evaluations.routes"));
const internships_routes_1 = __importDefault(require("./routes/internships.routes"));
const reports_routes_1 = __importDefault(require("./routes/reports.routes"));
const notifications_routes_1 = __importDefault(require("./routes/notifications.routes"));
const ai_routes_1 = __importDefault(require("./routes/ai.routes"));
const error_middleware_1 = require("./middlewares/error.middleware");
const audit_middleware_1 = require("./middlewares/audit.middleware");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: env_1.env.CORS_ORIGIN,
    credentials: true,
}));
app.use((0, helmet_1.default)());
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
app.use((0, morgan_1.default)("dev"));
app.use(audit_middleware_1.auditMiddleware);
app.get("/health", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "API Ndao Hifanosika opérationnelle",
        environment: env_1.env.NODE_ENV,
    });
});
app.get("/api/health", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "API Ndao Hifanosika opérationnelle",
        environment: env_1.env.NODE_ENV,
    });
});
app.use("/api/auth", auth_routes_1.default);
app.use("/api/users", users_routes_1.default);
app.use("/api/departements", departements_routes_1.default);
app.use("/api/projects", projects_routes_1.default);
app.use("/api/activities", activities_routes_1.default);
app.use("/api/milestones", milestones_routes_1.default);
app.use("/api/members", members_routes_1.default);
app.use("/api/beneficiaries", beneficiaries_routes_1.default);
app.use("/api/evaluations", evaluations_routes_1.default);
app.use("/api/internships", internships_routes_1.default);
app.use("/api/reports", reports_routes_1.default);
app.use("/api/notifications", notifications_routes_1.default);
app.use("/api/ai", ai_routes_1.default);
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: "Route introuvable",
    });
});
app.use(error_middleware_1.errorMiddleware);
logger_1.logger.info("Application Express initialisée");
exports.default = app;
//# sourceMappingURL=app.js.map