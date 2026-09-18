import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env";
import { logger } from "./config/logger";

import authRoutes from "./routes/auth.routes";
import usersRoutes from "./routes/users.routes";
import departementsRoutes from "./routes/departements.routes";
import projectsRoutes from "./routes/projects.routes";
import activitiesRoutes from "./routes/activities.routes";
import milestonesRoutes from "./routes/milestones.routes";
import membersRoutes from "./routes/members.routes";
import beneficiariesRoutes from "./routes/beneficiaries.routes";
import evaluationsRoutes from "./routes/evaluations.routes";
import internshipsRoutes from "./routes/internships.routes";
import reportsRoutes from "./routes/reports.routes";
import notificationsRoutes from "./routes/notifications.routes";
import aiRoutes from "./routes/ai.routes";

import { errorMiddleware } from "./middlewares/error.middleware";
import { auditMiddleware } from "./middlewares/audit.middleware";

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);

app.use(helmet());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(morgan("dev"));

app.use(auditMiddleware);

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "API Ndao Hifanosika opérationnelle",
    environment: env.NODE_ENV,
  });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "API Ndao Hifanosika opérationnelle",
    environment: env.NODE_ENV,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/departements", departementsRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/activities", activitiesRoutes);
app.use("/api/milestones", milestonesRoutes);
app.use("/api/members", membersRoutes);
app.use("/api/beneficiaries", beneficiariesRoutes);
app.use("/api/evaluations", evaluationsRoutes);
app.use("/api/internships", internshipsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/ai", aiRoutes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route introuvable",
  });
});

app.use(errorMiddleware);

logger.info("Application Express initialisée");

export default app;