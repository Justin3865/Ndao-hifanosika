import partnersRoutes from "./routes/partners.routes";
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
import elevationRoutes from "./routes/elevation.routes";
import internshipsRoutes from "./routes/internships.routes";
import internshipOffersRoutes from "./routes/internshipOffers.routes";
import reportsRoutes from "./routes/reports.routes";
import notificationsRoutes from "./routes/notifications.routes";
import aiRoutes from "./routes/ai.routes";
import aiExtraRoutes from "./routes/aiExtra.routes";
import lookupsRoutes from "./routes/lookups.routes";
import profileRoutes from "./routes/profile.routes";
import settingsRoutes from "./routes/settings.routes";
import auditRoutes from "./routes/audit.routes";
import zonesRoutes, { publicOrganizationRouter } from "./routes/zones.routes";
import certificatesRoutes, { publicCertificateRouter } from "./routes/certificates.routes";
import { campaignsRouter, gridsRouter } from "./routes/evalconfig.routes";
import { trackingRouter, publicTrackingRouter } from "./routes/tracking.routes";
import { vulnerabilityRouter, serviceRouter } from "./routes/vulnerability.routes";
import { eventNotifier } from "./middlewares/eventNotifier.middleware";
import { anomalyWatcher } from "./services/anomalyRealtime.service";

import activitySpaceRoutes from "./routes/activitySpace.routes";
import monitoringRoutes from "./routes/monitoring.routes";
import finalEvaluationRoutes from "./routes/finalEvaluation.routes";
import manualProgressRoutes from "./routes/manualProgress.routes";
import integrationRoutes from "./routes/integration.routes";
import followUpsRoutes from "./routes/followUps.routes";
import journeyRoutes from "./routes/journey.routes";
import attendanceRoutes from "./routes/attendance.routes";
import exportsRoutes from "./routes/exports.routes";
import consentsRoutes from "./routes/consents.routes";
import objectivesRoutes from "./routes/objectives.routes";
import internshipDocumentsRoutes from "./routes/internshipDocuments.routes";
import retentionRoutes from "./routes/retention.routes";
import projectCoordinatorsRoutes from "./routes/projectCoordinators.routes";
import metricsRoutes from "./routes/metrics.routes";
import narrativeRoutes from "./routes/narrative.routes";
import { perfMiddleware } from "./middlewares/perf.middleware";
import { queueStats } from "./utils/jobQueue";
import { errorMiddleware } from "./middlewares/error.middleware";
import { auditMiddleware } from "./middlewares/audit.middleware";
import { phoneLimit } from "./middlewares/phoneLimit.middleware";
import { emailLimit } from "./middlewares/emailLimit.middleware";
import { scopeOverlayRouter } from "./routes/scopeOverlay.routes";
import { mlDropoutRouter } from "./routes/mlDropout.routes";
import { enrollmentRouter } from "./routes/enrollment.routes";

const app = express();

app.use(
  cors({
    origin: env.CORS_ORIGIN.split(",").map((value) => value.trim()),
    credentials: true,
  }),
);

app.use(helmet());

// Mesure des temps de réponse (cible < 500 ms hors IA)
app.use(perfMiddleware);

app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "12mb" }));

// Tous les champs téléphone : 10 chiffres maximum (validation globale)
app.use(phoneLimit);

// Tous les champs e-mail : adresse valide (+ domaine imposé pour les bénéficiaires)
app.use(emailLimit);

app.use(morgan("dev"));

app.use(auditMiddleware);
app.use(eventNotifier);
app.use(anomalyWatcher);

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "API Ndao Hifanosika opérationnelle",
    environment: env.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    queue: queueStats().driver,
  });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "API Ndao Hifanosika opérationnelle",
    environment: env.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    queue: queueStats().driver,
  });
});

app.use("/api", scopeOverlayRouter); // [lot-protection-perimetre]
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/departements", departementsRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/partners", partnersRoutes);
app.use("/api/activities", activitiesRoutes);
app.use("/api/activity-space", activitySpaceRoutes);
app.use("/api/monitoring", monitoringRoutes);
app.use("/api/final-evaluation", finalEvaluationRoutes);
app.use("/api/manual-progress", manualProgressRoutes);
app.use("/api/integration", integrationRoutes);
app.use("/api/follow-ups", followUpsRoutes);
app.use("/api/journey", journeyRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/exports", exportsRoutes);
app.use("/api/consents", consentsRoutes);
app.use("/api/objectives", objectivesRoutes);
app.use("/api/internship-documents", internshipDocumentsRoutes);
app.use("/api/admin/retention", retentionRoutes);
app.use("/api/project-coordinators", projectCoordinatorsRoutes);
app.use("/api/metrics", metricsRoutes);
app.use("/api/milestones", milestonesRoutes);
app.use("/api/members", membersRoutes);
app.use("/api/beneficiaries", beneficiariesRoutes);
app.use("/api/evaluations", evaluationsRoutes);
app.use("/api/elevation", elevationRoutes);
app.use("/api/internships", internshipsRoutes);
app.use("/api/internship-offers", internshipOffersRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/ai", aiExtraRoutes);
app.use("/api/ai", narrativeRoutes);
app.use("/api/lookups", lookupsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/zones", zonesRoutes);
app.use("/api/certificates", certificatesRoutes);
app.use("/api/public/organization", publicOrganizationRouter);
app.use("/api/public/certificates", publicCertificateRouter);
app.use("/api/evaluation-grids", gridsRouter);
app.use("/api/evaluation-campaigns", campaignsRouter);
app.use("/api/tracking", trackingRouter);
app.use("/api/enrollment", enrollmentRouter);
app.use("/api/public/tracking", publicTrackingRouter);
app.use("/api/vulnerability", vulnerabilityRouter);
app.use("/api/service", serviceRouter);
app.use("/api/service", mlDropoutRouter); // [lot-protection-perimetre]

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route introuvable",
  });
});

app.use(errorMiddleware);

logger.info("Application Express initialisée");

export default app;